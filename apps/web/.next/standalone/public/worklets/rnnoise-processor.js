import createRNNWasmModule from "@jitsi/rnnoise-wasm/dist/rnnoise-sync";

class RNNoiseProcessor extends AudioWorkletProcessor {
  constructor() {
    super();
    this.ready = false;
    
    try {
      // Como é a versão 'sync', não usamos .then() nem await
      this.rnnoise = createRNNWasmModule();
      this.state = this.rnnoise._rnnoise_create();
      this.ready = true;
    } catch (e) {
      console.error("Falha ao inicializar o RNNoise síncrono:", e);
    }
  }

  process(inputs, outputs) {
    if (!this.ready) return true;

    const input = inputs[0];
    const output = outputs[0];

    // Se não houver dados, ignora
    if (!input || !output) return true;

    // Copia o áudio da entrada para a saída (Pass-through)
    for (let channel = 0; channel < input.length; ++channel) {
      const inputChannel = input[channel];
      const outputChannel = output[channel];
      
      for (let i = 0; i < inputChannel.length; ++i) {
        // Se você já tem a lógica do RNNoise, coloque aqui.
        // Se não tem, essa linha garante que o áudio passe sem ser apagado:
        outputChannel[i] = inputChannel[i]; 
      }
    }

    return true;
  }
}

registerProcessor("rnnoise-processor", RNNoiseProcessor);