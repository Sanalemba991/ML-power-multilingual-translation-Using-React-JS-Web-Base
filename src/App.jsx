import { useEffect, useRef, useState } from 'react';
import LanguageSelector from './components/LanguageSelector';
import Progress from './components/Progress';



function App() {

  // Model loading
  const [ready, setReady] = useState(null);
  const [disabled, setDisabled] = useState(false);
  const [progressItems, setProgressItems] = useState([]);

  // Inputs and outputs
  const [input, setInput] = useState('Created by Laitonjam Sanalemba Meitei');
  const [sourceLanguage, setSourceLanguage] = useState('eng_Latn');
  const [targetLanguage, setTargetLanguage] = useState('fra_Latn');
  const [output, setOutput] = useState('');

  // Create a reference to the worker object.
  const worker = useRef(null);

  // We use the `useEffect` hook to setup the worker as soon as the `App` component is mounted.
  useEffect(() => {
    if (!worker.current) {
      // Create the worker if it does not yet exist.
      worker.current = new Worker(new URL('./worker.js', import.meta.url), {
        type: 'module'
      });
    }

    // Create a callback function for messages from the worker thread.
    const onMessageReceived = (e) => {
      switch (e.data.status) {
        case 'initiate':
          // Model file start load: add a new progress item to the list.
          setReady(false);
          setProgressItems(prev => [...prev, e.data]);
          break;

        case 'progress':
          // Model file progress: update one of the progress items.
          setProgressItems(
            prev => prev.map(item => {
              if (item.file === e.data.file) {
                return { ...item, progress: e.data.progress }
              }
              return item;
            })
          );
          break;

        case 'done':
          // Model file loaded: remove the progress item from the list.
          setProgressItems(
            prev => prev.filter(item => item.file !== e.data.file)
          );
          break;

        case 'ready':
          // Pipeline ready: the worker is ready to accept messages.
          setReady(true);
          break;

        case 'update':
          // Generation update: update the output text.
          setOutput(e.data.output);
          break;

        case 'complete':
          // Generation complete: re-enable the "Translate" button
          setDisabled(false);
          break;
      }
    };

    // Attach the callback function as an event listener.
    worker.current.addEventListener('message', onMessageReceived);

    // Define a cleanup function for when the component is unmounted.
    return () => worker.current.removeEventListener('message', onMessageReceived);
  });

  const translate = () => {
    setDisabled(true);
    worker.current.postMessage({
      text: input,
      src_lang: sourceLanguage,
      tgt_lang: targetLanguage,
    });
  }

  return (
    <div className="min-h-screen bg-gray-100 flex flex-col items-center p-4">
      <h1 className="text-4xl font-bold mb-4 fade-in  text-rose-950">Translation</h1>
      <h2 className="text-2xl mb-8 fade-in text-rose-950">ML-powered multilingual translation in React</h2>

      <div className="bg-white p-6 rounded-lg shadow-lg w-full max-w-2xl fade-in">
        <div className="flex justify-between mb-4">
          <LanguageSelector type={"Source"} defaultLanguage={"eng_Latn"} onChange={x => setSourceLanguage(x.target.value)} />
          <LanguageSelector type={"Target"} defaultLanguage={"fra_Latn"} onChange={x => setTargetLanguage(x.target.value)} />
        </div>

        <div className="grid grid-cols-1 gap-4 mb-4">
          <textarea className="w-full p-2 border rounded-lg" value={input} rows={3} onChange={e => setInput(e.target.value)}></textarea>
          <textarea className="w-full p-2 border rounded-lg" value={output} rows={3} readOnly></textarea>
        </div>

        <button 
         className={`bg-orange-500 text-white py-2 px-4 rounded ${disabled ? 'opacity-50 cursor-not-allowed' : 'hover:bg-orange-700'}`}
          disabled={disabled} 
          onClick={translate}
        >
          Translate
        </button>

        <div className="mt-4 fade-in">
          {ready === false && (
            <label className="text-gray-500">Loading models... (only run once)</label>
          )}
          {progressItems.map(data => (
            <div key={data.file} className="my-2">
              <Progress text={data.file} percentage={data.progress} />
            </div>
          ))}
        </div>
      </div>
    </div>
  );
}

export default App;
