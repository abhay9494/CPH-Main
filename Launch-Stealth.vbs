Set objShell = CreateObject("Shell.Application")
Set FSO = CreateObject("Scripting.FileSystemObject")

' Get the exact folder where this script is located
strPath = FSO.GetParentFolderName(WScript.ScriptFullName)

' 🟢 THE STEALTH EXECUTION
' Parameters: 
' 1. Application: cmd.exe
' 2. Arguments: Change directory, then run npm start
' 3. Working Directory: (Blank, handled by arguments)
' 4. Verb: "runas" (This forces the Admin UAC prompt!)
' 5. WindowStyle: 0 (This mathematically forces the CMD window to be 100% invisible)
objShell.ShellExecute "cmd.exe", "/c cd /d """ & strPath & """ && npm start", "", "runas", 0