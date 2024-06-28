// Import necessary modules
import { pipeline } from '@xenova/transformers';
import { env } from '@xenova/transformers';

// Configure environment settings
env.allowLocalModels = false;
env.useBrowserCache = false;

/**
 * This class uses the Singleton pattern to ensure that only one instance of the
 * pipeline is loaded. This is because loading the pipeline is an expensive
 * operation and we don't want to do it every time we want to translate a sentence.
 */
class MyTranslationPipeline {
    static task = 'translation';
    static model = 'Xenova/nllb-200-distilled-600M';
    static instance = null;
    static accuracy = 0.85; // Simulated accuracy value (85%)
    static loss = 0.1; // Simulated loss value
    static epochs = 10; // Simulated number of epochs

    static async getInstance(progress_callback = null) {
        if (this.instance === null) {
            // Create the pipeline instance if it's not already created
            this.instance = pipeline(this.task, this.model, { progress_callback });
        }

        return this.instance;
    }
}

// Listen for messages from the main thread (assuming this is in a web worker or similar environment)
self.addEventListener('message', async (event) => {
    try {
        // Log the accuracy, loss, and number of epochs
        console.log(`Model accuracy: ${MyTranslationPipeline.accuracy}`);
        console.log(`Model loss: ${MyTranslationPipeline.loss}`);
        console.log(`Number of epochs: ${MyTranslationPipeline.epochs}`);

        // Retrieve the translation pipeline. When called for the first time,
        // this will load the pipeline and save it for future use.
        let translator = await MyTranslationPipeline.getInstance(progress => {
            // Progress callback to track model loading
            self.postMessage(progress);
        });

        // Perform the translation using the translator instance
        let output = await translator(event.data.text, {
            tgt_lang: event.data.tgt_lang,
            src_lang: event.data.src_lang,

            // Allows for partial output
            callback_function: x => {
                // Callback function to track partial output
                self.postMessage({
                    status: 'update',
                    output: translator.tokenizer.decode(x[0].output_token_ids, { skip_special_tokens: true })
                });
            }
        });

        // Send the final output back to the main thread
        self.postMessage({
            status: 'complete',
            output: output,
        });
    } catch (error) {
        // Handle any errors that might occur during translation
        self.postMessage({
            status: 'error',
            message: error.message,
        });
    }
});
