import React, { useState } from 'react';
import { Upload, ArrowBigUpDash, AlertCircle, Plus, X, Layers, Wand2 } from 'lucide-react';
import CompareSlider from './components/CompareSlider';
import ChatInterface from './components/ChatInterface';
import { generateDesignedImage, chatWithConsultant } from './services/gemini';
import { DESIGN_STYLES, INITIAL_CHAT_MESSAGE } from './constants';
import { AppState, ChatMessage, RoomView } from './types';

function App() {
  const [appState, setAppState] = useState<AppState>(AppState.UPLOAD);
  
  // State for multiple views
  const [roomViews, setRoomViews] = useState<RoomView[]>([]);
  const [activeViewId, setActiveViewId] = useState<string | null>(null);
  
  const [editPrompt, setEditPrompt] = useState('');
  const [applyToAll, setApplyToAll] = useState(false);
  
  const [chatMessages, setChatMessages] = useState<ChatMessage[]>([
    { role: 'model', text: INITIAL_CHAT_MESSAGE, id: 'init' }
  ]);
  const [isChatTyping, setIsChatTyping] = useState(false);

  // Helper to process uploaded files
  const processFiles = (files: FileList | null) => {
    if (!files) return;
    
    Array.from(files).forEach(file => {
      const reader = new FileReader();
      reader.onloadend = () => {
        const newView: RoomView = {
          id: Date.now().toString() + Math.random().toString(),
          original: reader.result as string,
          generated: null,
          isLoading: false
        };
        
        setRoomViews(prev => {
          const newState = [...prev, newView];
          // Set active view if it's the first one
          if (prev.length === 0) setActiveViewId(newView.id);
          return newState;
        });
        
        if (appState === AppState.UPLOAD) {
          setAppState(AppState.EDIT);
        }
      };
      reader.readAsDataURL(file);
    });
  };

  const handleImageUpload = (e: React.ChangeEvent<HTMLInputElement>) => {
    processFiles(e.target.files);
  };

  const removeView = (id: string, e: React.MouseEvent) => {
    e.stopPropagation();
    setRoomViews(prev => {
      const filtered = prev.filter(v => v.id !== id);
      if (activeViewId === id && filtered.length > 0) {
        setActiveViewId(filtered[0].id);
      } else if (filtered.length === 0) {
        setAppState(AppState.UPLOAD);
        setActiveViewId(null);
      }
      return filtered;
    });
  };

  // Generate for ALL views (Styles) or Single view (Refine)
  const handleGenerate = async (prompt: string, mode: 'style' | 'refine' = 'style') => {
    if (roomViews.length === 0) return;

    // Logic:
    // Style (Preset/Batch) -> Apply to ALL views. Always use ORIGINAL as source to prevent deep-frying.
    // Refine (Manual) -> Apply to ACTIVE view only. Use GENERATED (if exists) as source for iterative edits.

    if (mode === 'style') {
       // 1. Mark all as loading
       setRoomViews(prev => prev.map(v => ({ ...v, isLoading: true })));

       try {
         // 2. Generate in parallel
         const promises = roomViews.map(async (view) => {
            try {
              const result = await generateDesignedImage(view.original, prompt);
              return { id: view.id, success: true, data: result };
            } catch (e) {
              return { id: view.id, success: false, data: null };
            }
         });

         const results = await Promise.all(promises);

         // 3. Update state
         setRoomViews(prev => prev.map(view => {
            const res = results.find(r => r.id === view.id);
            if (res && res.success && res.data) {
              return { ...view, generated: res.data, isLoading: false };
            }
            return { ...view, isLoading: false }; // Keep old state on failure
         }));

       } catch (error) {
         console.error("Batch generation failed", error);
         setRoomViews(prev => prev.map(v => ({ ...v, isLoading: false })));
         alert("Something went wrong with the design generation.");
       }
    } else {
       // Refine Mode: Active View Only
       const activeView = roomViews.find(v => v.id === activeViewId);
       if (!activeView) return;

       // Use generated image as source if available (Iterative), otherwise original
       const sourceImage = activeView.generated || activeView.original;

       setRoomViews(prev => prev.map(v => v.id === activeViewId ? { ...v, isLoading: true } : v));

       try {
         const result = await generateDesignedImage(sourceImage, prompt);
         setRoomViews(prev => prev.map(v => 
            v.id === activeViewId ? { ...v, generated: result, isLoading: false } : v
         ));
         setEditPrompt(''); // Clear prompt on success
       } catch (error) {
         console.error("Refine failed", error);
         setRoomViews(prev => prev.map(v => v.id === activeViewId ? { ...v, isLoading: false } : v));
         alert("Could not refine the image.");
       }
    }
  };

  const handleEditSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (!editPrompt.trim()) return;
    // If applying to all, treat it as a 'style' application (fresh gen from original).
    // If applying to active, treat it as 'refine' (iterative).
    handleGenerate(editPrompt, applyToAll ? 'style' : 'refine');
  };

  const handleChatMessage = async (text: string) => {
    const newUserMsg: ChatMessage = { role: 'user', text, id: Date.now().toString() };
    setChatMessages(prev => [...prev, newUserMsg]);
    setIsChatTyping(true);

    try {
      // Gather context: Pass generated images if available, else original.
      // We pass ALL views to the chat so it understands the "whole room".
      const contextImages = roomViews.map(v => v.generated || v.original);
      
      const responseText = await chatWithConsultant([...chatMessages, newUserMsg], contextImages);
      
      const newBotMsg: ChatMessage = { role: 'model', text: responseText, id: (Date.now() + 1).toString() };
      setChatMessages(prev => [...prev, newBotMsg]);
    } catch (error) {
       console.error(error);
    } finally {
      setIsChatTyping(false);
    }
  };

  const activeView = roomViews.find(v => v.id === activeViewId);

  // Render Upload Screen
  if (appState === AppState.UPLOAD) {
    return (
      <div className="min-h-screen bg-slate-50 flex items-center justify-center p-4">
        <div className="max-w-xl w-full text-center space-y-8">
          <div className="space-y-4">
             <div className="inline-flex items-center justify-center w-24 h-24 rounded-3xl bg-indigo-600 text-white shadow-xl shadow-indigo-200 mb-6 hover:scale-105 transition-transform duration-300">
                <ArrowBigUpDash size={48} />
             </div>
             <h1 className="text-5xl font-extrabold text-slate-900 tracking-tight">Upgrade</h1>
             <p className="text-xl text-slate-600 max-w-md mx-auto">Transform your living space instantly. Upload your photos and watch the magic happen.</p>
          </div>

          <div className="bg-white p-8 rounded-2xl shadow-xl border border-slate-100 transition-all hover:shadow-2xl">
            <label className="flex flex-col items-center justify-center w-full h-64 border-2 border-slate-300 border-dashed rounded-xl cursor-pointer hover:bg-slate-50 hover:border-indigo-400 transition-colors group">
                <div className="flex flex-col items-center justify-center pt-5 pb-6">
                    <div className="p-4 bg-indigo-50 text-indigo-600 rounded-full mb-4 group-hover:scale-110 transition-transform">
                      <Upload className="w-8 h-8" />
                    </div>
                    <p className="mb-2 text-sm text-slate-700 font-medium">Click to upload photos</p>
                    <p className="text-xs text-slate-500">Support for multiple angles & views</p>
                </div>
                <input type="file" className="hidden" accept="image/*" multiple onChange={handleImageUpload} />
            </label>
          </div>

          <div className="flex items-center justify-center gap-2 text-sm text-slate-400">
             <AlertCircle size={14} />
             <span>Photos are processed securely and privately.</span>
          </div>
        </div>
      </div>
    );
  }

  // Render Main Editor
  return (
    <div className="min-h-screen bg-slate-50">
      {/* Navbar */}
      <nav className="bg-white border-b border-slate-200 sticky top-0 z-50">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
          <div className="flex justify-between h-16 items-center">
             <div className="flex items-center gap-2 cursor-pointer group" onClick={() => {
                if(confirm("Start over? This will clear all images.")) {
                  setAppState(AppState.UPLOAD);
                  setRoomViews([]);
                  setChatMessages([{ role: 'model', text: INITIAL_CHAT_MESSAGE, id: 'init' }]);
                }
             }}>
                <div className="w-8 h-8 bg-indigo-600 rounded-lg flex items-center justify-center text-white group-hover:bg-indigo-700 transition-colors">
                  <ArrowBigUpDash size={20} />
                </div>
                <span className="font-extrabold text-slate-900 text-xl tracking-tight">Upgrade</span>
             </div>
             <div className="flex items-center gap-4">
                <label className="flex items-center gap-2 text-sm font-medium text-indigo-600 hover:text-indigo-700 cursor-pointer bg-indigo-50 px-3 py-2 rounded-lg transition-colors border border-indigo-100">
                   <Plus size={16} />
                   Add Photo
                   <input type="file" className="hidden" accept="image/*" multiple onChange={handleImageUpload} />
                </label>
             </div>
          </div>
        </div>
      </nav>

      <main className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8">
        <div className="grid grid-cols-1 lg:grid-cols-12 gap-8">
          
          {/* Left Column: Visualizer & Controls (8 cols) */}
          <div className="lg:col-span-8 space-y-6">
            
            {/* Visualizer Area */}
            <div className="space-y-4">
               <div className="flex justify-between items-end">
                  <h2 className="text-xl font-bold text-slate-800 tracking-tight">
                    Visualization 
                    {roomViews.length > 1 && <span className="text-slate-400 font-normal text-sm ml-2">({roomViews.length} views)</span>}
                  </h2>
                  {activeView?.generated && (
                    <span className="text-xs font-medium text-slate-500 uppercase tracking-wide">Drag slider to compare</span>
                  )}
               </div>

               {/* Main Canvas */}
               {activeView && (
                 <CompareSlider 
                    key={activeView.id} // Force re-render on switch
                    originalImage={activeView.original} 
                    generatedImage={activeView.generated} 
                    loading={activeView.isLoading} 
                 />
               )}

               {/* Thumbnails Strip */}
               {roomViews.length > 0 && (
                 <div className="flex gap-2 overflow-x-auto pb-2 scrollbar-hide">
                    {roomViews.map((view, index) => (
                      <div 
                        key={view.id}
                        onClick={() => setActiveViewId(view.id)}
                        className={`relative w-24 h-24 flex-shrink-0 rounded-lg overflow-hidden cursor-pointer border-2 transition-all ${activeViewId === view.id ? 'border-indigo-600 ring-2 ring-indigo-100 shadow-md' : 'border-transparent opacity-70 hover:opacity-100'}`}
                      >
                         <img src={view.generated || view.original} className="w-full h-full object-cover" alt={`View ${index + 1}`} />
                         {/* Close Button */}
                         <button 
                            onClick={(e) => removeView(view.id, e)}
                            className="absolute top-1 right-1 bg-black/50 hover:bg-red-500 text-white rounded-full p-0.5 transition-colors"
                         >
                           <X size={12} />
                         </button>
                         {/* Loading Badge */}
                         {view.isLoading && (
                           <div className="absolute inset-0 bg-black/40 flex items-center justify-center">
                             <div className="w-4 h-4 border-2 border-white border-t-transparent rounded-full animate-spin"></div>
                           </div>
                         )}
                         {/* View Label */}
                         <div className="absolute bottom-0 inset-x-0 bg-black/50 text-white text-[10px] text-center py-0.5 backdrop-blur-sm">
                           View {index + 1}
                         </div>
                      </div>
                    ))}
                    {/* Add Button in strip */}
                    <label className="w-24 h-24 flex-shrink-0 rounded-lg border-2 border-dashed border-slate-300 flex flex-col items-center justify-center cursor-pointer hover:border-indigo-400 hover:bg-indigo-50 text-slate-400 hover:text-indigo-600 transition-colors">
                        <Plus size={24} />
                        <span className="text-xs mt-1">Add View</span>
                        <input type="file" className="hidden" accept="image/*" multiple onChange={handleImageUpload} />
                    </label>
                 </div>
               )}
            </div>

            {/* Custom Edit Input (Tweaks) */}
            <div className="bg-white p-5 rounded-xl shadow-sm border border-slate-200">
               <div className="flex flex-col sm:flex-row sm:justify-between sm:items-center mb-4 gap-2">
                 <label className="block text-sm font-bold text-slate-800 flex items-center gap-2">
                   {applyToAll ? <Layers size={18} className="text-indigo-600"/> : <Wand2 size={18} className="text-indigo-600"/>}
                   {applyToAll ? 'Upgrade Entire Space' : 'Refine Active View'}
                 </label>
                 
                 <div className="flex bg-slate-100 p-1 rounded-lg">
                    <button 
                       type="button"
                       onClick={() => setApplyToAll(false)}
                       className={`px-3 py-1.5 text-xs font-semibold rounded-md transition-all ${!applyToAll ? 'bg-white text-indigo-600 shadow-sm' : 'text-slate-500 hover:text-slate-700 hover:bg-slate-200/50'}`}
                    >
                       Active View
                    </button>
                    <button 
                       type="button"
                       onClick={() => setApplyToAll(true)}
                       className={`px-3 py-1.5 text-xs font-semibold rounded-md transition-all ${applyToAll ? 'bg-white text-indigo-600 shadow-sm' : 'text-slate-500 hover:text-slate-700 hover:bg-slate-200/50'}`}
                    >
                       All Views
                    </button>
                 </div>
               </div>
               
               <form onSubmit={handleEditSubmit} className="flex gap-3">
                  <div className="relative flex-1">
                    <input 
                      type="text" 
                      value={editPrompt}
                      onChange={(e) => setEditPrompt(e.target.value)}
                      placeholder={applyToAll ? "e.g., 'Modern farmhouse with blue accents'" : "e.g., 'Make the rug blue' or 'Remove the chair'"}
                      className="w-full pl-4 pr-4 py-3 bg-slate-50 border border-slate-200 rounded-lg focus:ring-2 focus:ring-indigo-500 focus:border-indigo-500 outline-none transition-all shadow-sm"
                    />
                  </div>
                  <button 
                    type="submit" 
                    disabled={roomViews.some(v => v.isLoading) || !editPrompt.trim()}
                    className="bg-slate-900 text-white px-6 py-3 rounded-lg font-bold hover:bg-slate-800 disabled:opacity-50 disabled:cursor-not-allowed transition-all shadow-md hover:shadow-lg whitespace-nowrap"
                  >
                    {applyToAll ? 'Upgrade All' : 'Refine'}
                  </button>
               </form>
               <p className="text-xs text-slate-500 mt-3 flex items-center gap-1.5">
                 <AlertCircle size={14} className="text-indigo-500" />
                 {applyToAll 
                   ? "Applies design to all photos using originals as base."
                   : "Iteratively refines the current generated image."}
               </p>
            </div>

            {/* Style Carousel (Global) */}
            <div className="space-y-3">
              <div className="flex items-center gap-2">
                 <h3 className="text-sm font-bold text-slate-800 uppercase tracking-wider">Quick Themes</h3>
                 <span className="text-[10px] bg-indigo-100 text-indigo-700 px-2 py-0.5 rounded-full font-bold">Batch Apply</span>
              </div>
              <div className="flex gap-4 overflow-x-auto pb-4 scrollbar-hide snap-x pt-2">
                 {DESIGN_STYLES.map((style) => (
                   <button
                     key={style.id}
                     onClick={() => handleGenerate(style.prompt, 'style')}
                     disabled={roomViews.some(v => v.isLoading)}
                     className="flex-shrink-0 w-36 group snap-start disabled:opacity-50 text-left"
                   >
                     <div className="w-36 h-36 rounded-2xl overflow-hidden mb-3 relative shadow-md group-hover:shadow-xl transition-all duration-300">
                        <img 
                          src={style.thumbnail} 
                          alt={style.name} 
                          className="w-full h-full object-cover group-hover:scale-110 transition-transform duration-500" 
                        />
                        <div className="absolute inset-0 bg-gradient-to-t from-black/60 to-transparent opacity-60 group-hover:opacity-40 transition-opacity" />
                        <div className="absolute bottom-3 left-3 right-3">
                             <span className="text-white text-sm font-bold leading-tight block drop-shadow-md">
                                {style.name}
                             </span>
                        </div>
                     </div>
                   </button>
                 ))}
              </div>
            </div>

          </div>

          {/* Right Column: Chat (4 cols) */}
          <div className="lg:col-span-4 space-y-4">
             <ChatInterface 
                messages={chatMessages} 
                onSendMessage={handleChatMessage} 
                isTyping={isChatTyping} 
             />
             
             {/* Info Box */}
             <div className="bg-indigo-50 p-5 rounded-xl border border-indigo-100 text-sm text-indigo-900 shadow-sm">
                <p className="font-bold mb-2 flex items-center gap-2">
                    <ArrowBigUpDash size={16} />
                    Upgrade Pro Tip
                </p>
                <p className="opacity-90 leading-relaxed">
                    I can see all your room photos! Ask me about layout cohesion or furniture matching across different angles to get a unified design for your space.
                </p>
             </div>
          </div>

        </div>
      </main>
    </div>
  );
}

export default App;