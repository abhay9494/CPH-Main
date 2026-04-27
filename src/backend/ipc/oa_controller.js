const { ipcMain, BrowserWindow, desktopCapturer } = require('electron');
const fs = require('fs');
const path = require('path');
const os = require('os');
const { spawn } = require('child_process');

let accumulatedScreenshots = [];
let autoTyperProcess = null;

// ==========================================================
// CORE DOM INJECTOR (Bulletproof Paste)
// ==========================================================
async function sendPayloadToWindow(win, customText, images = []) {
    if (!win || win.isDestroyed()) return;
    const { clipboard, nativeImage } = require('electron');
    
    const isBoxReady = await win.webContents.executeJavaScript(`(() => { 
        try {
            const el = document.querySelector('#prompt-textarea, [contenteditable="true"][role="textbox"], .ql-editor'); 
            if (el && el.offsetParent !== null) { el.focus(); return true; }
            return false;
        } catch(e) { return false; }
    })()`);
    
    if (!isBoxReady) {
        console.log("🛑 Aborted Paste: Textbox is hidden (AI is currently in Voice Mode).");
        return;
    }
    
    for (let imgData of images) {
        const img = nativeImage.createFromDataURL(imgData);
        clipboard.writeImage(img);
        win.webContents.paste();
        await new Promise(r => setTimeout(r, 400));
    }
    
    if (customText) {
        clipboard.writeText(customText);
        win.webContents.paste();
    }

    const sendBtnSelector = 'button[aria-label*="Send" i], button[aria-label*="Submit" i], button[data-testid="send-button"], button[aria-label*="Grok" i], button[aria-label*="Enter" i]';
    let isReady = false;
    let attempts = 0;
    while (!isReady && attempts < 40) {
        isReady = await win.webContents.executeJavaScript(`(() => { try { const btn = document.querySelector('${sendBtnSelector}'); return !!(btn && !btn.disabled && btn.getAttribute('aria-disabled') !== 'true'); } catch(e) { return false; } })()`);
        if (!isReady) { await new Promise(r => setTimeout(r, 500)); attempts++; }
    }
    
    await new Promise(r => setTimeout(r, 200));
    await win.webContents.executeJavaScript(`(() => { try { const btn = document.querySelector('${sendBtnSelector}'); if(btn) btn.click(); return true; } catch(e) { return false; } })()`);
    setTimeout(() => { if (!win.isDestroyed()) win.webContents.sendInputEvent({ type: 'keyDown', keyCode: 'Enter' }); }, 200);
}

// ==========================================================
// CONTROLLER EXPORT
// ==========================================================
function setupOAController(appState, PROMPTS) {
    ipcMain.handle('capture-screenshot', async () => {
        try {
            const sources = await desktopCapturer.getSources({ types: ['screen'], thumbnailSize: { width: 1920, height: 1080 } });
            const screenImage = sources[0].thumbnail.toDataURL(); 
            const saveDir = 'D:/Files';
            if (!fs.existsSync(saveDir)) { fs.mkdirSync(saveDir, { recursive: true }); }
            const filePath = path.join(saveDir, `screenshot_${Date.now()}.png`);
            const base64Data = screenImage.replace(/^data:image\/png;base64,/, "");
            fs.writeFileSync(filePath, base64Data, 'base64');

            accumulatedScreenshots.push(screenImage);
            return accumulatedScreenshots.length;
        } catch (err) { return accumulatedScreenshots.length; }
    });

    ipcMain.handle('clear-screenshots', async () => { accumulatedScreenshots = []; return 0; });
    ipcMain.handle('get-screenshots', async () => { return accumulatedScreenshots; });

    ipcMain.handle('send-screenshots-to-ai', async (event, customPrompt) => {
        if (accumulatedScreenshots.length === 0) return false;
        const codePrompt = customPrompt || PROMPTS.OA_AUTOMATION('C++');
        const voicePrompt = PROMPTS.VOICE_CONTEXT;
        await sendPayloadToWindow(appState.codeWebWindow, codePrompt, accumulatedScreenshots);
        setTimeout(async () => {
            await sendPayloadToWindow(appState.voiceWebWindow, voicePrompt, accumulatedScreenshots);
            accumulatedScreenshots = [];
        }, 1500);
        return true;
    });

    ipcMain.handle('send-oa-automation', async (event, language) => {
        if (accumulatedScreenshots.length === 0) return false;
        const codePrompt = PROMPTS.OA_AUTOMATION(language);
        const voicePrompt = PROMPTS.VOICE_CONTEXT;
        await sendPayloadToWindow(appState.codeWebWindow, codePrompt, accumulatedScreenshots);
        setTimeout(async () => {
            await sendPayloadToWindow(appState.voiceWebWindow, voicePrompt, accumulatedScreenshots);
            accumulatedScreenshots = [];
        }, 1500);
        return true;
    });

    ipcMain.handle('send-oa-refactor', async () => {
        await sendPayloadToWindow(appState.codeWebWindow, PROMPTS.REFACTOR, []);
        setTimeout(async () => { await sendPayloadToWindow(appState.voiceWebWindow, PROMPTS.VOICE_CONTEXT, []); }, 1500);
        return true;
    });

    ipcMain.handle('send-oa-fix-error', async () => {
        if (accumulatedScreenshots.length === 0) return false;
        await sendPayloadToWindow(appState.codeWebWindow, PROMPTS.FIX_ERROR, accumulatedScreenshots);
        setTimeout(async () => {
            await sendPayloadToWindow(appState.voiceWebWindow, PROMPTS.VOICE_CONTEXT, accumulatedScreenshots);
            accumulatedScreenshots = [];
        }, 1500);
        return true;
    });

    ipcMain.handle('send-oa-regenerate', async () => {
        const script = `(() => { try { const btn = Array.from(document.querySelectorAll('button')).find(b => (b.textContent||'').toLowerCase().includes('regenerate') || (b.getAttribute('aria-label')||'').toLowerCase().includes('regenerate')); if(btn) { btn.click(); return true; } return false; } catch(e) { return false; } })();`;
        if (appState.codeWebWindow && !appState.codeWebWindow.isDestroyed()) appState.codeWebWindow.webContents.executeJavaScript(script).catch(()=>{});
        if (appState.voiceWebWindow && !appState.voiceWebWindow.isDestroyed()) appState.voiceWebWindow.webContents.executeJavaScript(script).catch(()=>{});
        return true;
    });

    ipcMain.handle('send-manual-text', async (event, text) => {
        if (!text) return;
        await sendPayloadToWindow(appState.voiceWebWindow, text, []);
    });

    ipcMain.on('start-auto-type', (event, rawCode, wpmSpeed, mistakeChance) => {
        BrowserWindow.getAllWindows().forEach(w => w.webContents.send('typing-status', true));
        let cleanCode = rawCode.replace(/^(c\+\+|python|java|javascript|js)\s*\n/i, '');
        const b64Code = Buffer.from(cleanCode).toString('base64');
        const ps1Path = path.join(os.tmpdir(), 'cptyper.ps1');
        
        const psScript = `
        param([string]$b64, [int]$wpm, [int]$mistakeChance)
        Add-Type -AssemblyName System.Windows.Forms
        $text = [System.Text.Encoding]::UTF8.GetString([System.Convert]::FromBase64String($b64))
        $chars = $text.ToCharArray()
        $baseDelay = [math]::Round(12000 / $wpm)
        if ($baseDelay -lt 10) { $baseDelay = 10 }
        
        $lineIdx = 0
        [Console]::WriteLine("LINE_0")
        [Console]::Out.Flush()
        
        foreach ($c in $chars) {
            $key = $c.ToString()
            if ($key -eq "\`r") { continue }
            if ($key -eq "\`n") {
                [System.Windows.Forms.SendKeys]::SendWait("{ENTER}")
                Start-Sleep -Milliseconds 50
                [System.Windows.Forms.SendKeys]::SendWait("x+{HOME}+{HOME}{BACKSPACE}")
                Start-Sleep -Milliseconds ($baseDelay * 2)
                $lineIdx++
                [Console]::WriteLine("LINE_$lineIdx")
                [Console]::Out.Flush()
                continue
            }
            if ('+^%~(){}[]'.Contains($key)) { $key = "{$key}" }
            
            if ($key -match '^[a-z]$') {
                if ((Get-Random -Minimum 1 -Maximum 100) -le $mistakeChance) {
                    $wrongChars = "abcdefghijklmnopqrstuvwxyz"
                    $wrong = $wrongChars[(Get-Random -Maximum 26)].ToString()
                    [System.Windows.Forms.SendKeys]::SendWait($wrong)
                    Start-Sleep -Milliseconds ($baseDelay + 50)
                    [System.Windows.Forms.SendKeys]::SendWait("{BACKSPACE}")
                    Start-Sleep -Milliseconds ($baseDelay + 50)
                }
            }
            [System.Windows.Forms.SendKeys]::SendWait($key)
            if ($c -eq '{' -or $c -eq '[' -or $c -eq '(' -or $c -eq '"' -or $c -eq "'") {
                Start-Sleep -Milliseconds 40
                [System.Windows.Forms.SendKeys]::SendWait("{DELETE}")
            }
            $variance = Get-Random -Minimum -10 -Maximum 10
            $delay = $baseDelay + $variance
            if ($delay -lt 10) { $delay = 10 }
            Start-Sleep -Milliseconds $delay
        }
        `;
        fs.writeFileSync(ps1Path, psScript);
        if (autoTyperProcess) { try { autoTyperProcess.kill(); } catch(e){} }
        
        autoTyperProcess = spawn('powershell.exe', ['-ExecutionPolicy', 'Bypass', '-File', ps1Path, b64Code, wpmSpeed, mistakeChance]);
        
        autoTyperProcess.stdout.on('data', (data) => {
            const text = data.toString();
            const lines = text.split(/[\r\n]+/);
            lines.forEach(l => {
                if (l.startsWith('LINE_')) {
                    const idx = parseInt(l.replace('LINE_', ''));
                    if (!isNaN(idx)) BrowserWindow.getAllWindows().forEach(w => w.webContents.send('typing-progress', idx));
                }
            });
        });
        autoTyperProcess.on('close', () => {
            BrowserWindow.getAllWindows().forEach(w => w.webContents.send('typing-status', false));
        });
    });

    ipcMain.on('stop-auto-type', (event) => {
        if (autoTyperProcess) {
            try { autoTyperProcess.kill(); } catch(e){}
            autoTyperProcess = null;
        }
        BrowserWindow.getAllWindows().forEach(w => w.webContents.send('typing-status', false));
    });
}

module.exports = { setupOAController, sendPayloadToWindow };