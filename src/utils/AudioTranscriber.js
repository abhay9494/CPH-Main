export class AudioTranscriber {
    constructor(onFinal, onInterim, onError) {
        this.onFinal = onFinal;
        this.onInterim = onInterim;
        this.onError = onError;
        
        this.recognition = null;
        this.isListening = false;
        
        this.transcriptBuffer = "";
        this.currentInterim = "";
        
        this.silenceTimer = null;
        this.SILENCE_DELAY_MS = 2000; // 2 seconds of silence triggers the AI

        this.init();
    }

    init() {
        const SpeechRecognition = window.SpeechRecognition || window.webkitSpeechRecognition;
        if (!SpeechRecognition) {
            if (this.onError) this.onError("api-not-supported");
            return;
        }

        this.recognition = new SpeechRecognition();
        this.recognition.continuous = true;
        this.recognition.interimResults = true; // Crucial for live feedback
        this.recognition.lang = 'en-US';

        this.recognition.onstart = () => {
            this.isListening = true;
        };

        this.recognition.onresult = (event) => {
            let interim = '';
            
            for (let i = event.resultIndex; i < event.results.length; ++i) {
                if (event.results[i].isFinal) {
                    this.transcriptBuffer += " " + event.results[i][0].transcript;
                } else {
                    interim += event.results[i][0].transcript;
                }
            }
            
            this.currentInterim = interim;
            
            // 1. Send live feedback to the UI immediately!
            const fullLiveText = (this.transcriptBuffer + " " + this.currentInterim).trim();
            if (this.onInterim && fullLiveText) {
                this.onInterim(fullLiveText);
            }
            
            // 2. Restart the countdown timer every time a syllable is heard
            this.resetSilenceTimer();
        };

        this.recognition.onerror = (event) => {
            if (this.onError) this.onError(event.error);
            // If it's just silence, don't panic. If it's a real error, restart.
            if (event.error !== 'no-speech' && event.error !== 'aborted') {
                setTimeout(() => this.restart(), 1000);
            }
        };

        this.recognition.onend = () => {
            // Force the loop to stay alive indefinitely
            if (this.isListening) {
                try { this.recognition.start(); } catch(e){}
            }
        };
    }

    resetSilenceTimer() {
        if (this.silenceTimer) clearTimeout(this.silenceTimer);
        
        this.silenceTimer = setTimeout(() => {
            const finalStr = (this.transcriptBuffer + " " + this.currentInterim).trim();
            
            if (finalStr !== "") {
                // 3. 2 Seconds of silence passed! Send the payload to the AI!
                if (this.onFinal) this.onFinal(finalStr);
                
                // 4. Wipe the memory for the next question
                this.transcriptBuffer = "";
                this.currentInterim = "";
                if (this.onInterim) this.onInterim(""); 
            }
        }, this.SILENCE_DELAY_MS);
    }

    start(languageCode = 'en-US') {
        if (!this.recognition || this.isListening) return;
        this.recognition.lang = languageCode;
        this.isListening = true;
        try { this.recognition.start(); } catch (e) { }
    }

    stop() {
        if (!this.recognition) return;
        this.isListening = false;
        this.recognition.stop();
        if (this.silenceTimer) clearTimeout(this.silenceTimer);
        this.transcriptBuffer = "";
        this.currentInterim = "";
        if (this.onInterim) this.onInterim("");
    }

    restart() {
        this.stop();
        setTimeout(() => this.start(this.recognition.lang), 500);
    }
}