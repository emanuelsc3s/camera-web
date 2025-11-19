import React, { useState, useEffect, useRef } from 'react';
import { loadModels, detectFace, createFaceMatcher, matchFace } from './services/faceService';
import { initDB, saveUserToDB, getAllUsersFromDB, deleteUserFromDB } from './services/storageService';
import { WebcamView } from './components/WebcamView';
import { RegisteredUser, DetectionBox } from './types';
import { Plus, ScanFace, Users, Trash2, ShieldCheck, Database } from 'lucide-react';

// Safe ID generation for environments where crypto.randomUUID might not be available (e.g. non-secure http)
const generateId = () => {
  if (typeof crypto !== 'undefined' && crypto.randomUUID) {
    return crypto.randomUUID();
  }
  return Math.random().toString(36).substring(2) + Date.now().toString(36);
};

export default function App() {
  const [isLoading, setIsLoading] = useState(true);
  const [activeTab, setActiveTab] = useState<'register' | 'recognize' | 'users'>('register');
  const [users, setUsers] = useState<RegisteredUser[]>([]);
  const [registerName, setRegisterName] = useState('');
  const [registerStatus, setRegisterStatus] = useState<{ type: 'success' | 'error' | 'info', msg: string } | null>(null);
  const [processingRegister, setProcessingRegister] = useState(false);
  
  // Recognition State
  const [detectedBoxes, setDetectedBoxes] = useState<DetectionBox[]>([]);
  const lastProcessedTime = useRef<number>(0);
  
  // Initial Load
  useEffect(() => {
    const init = async () => {
      try {
        // Initialize DB first
        await initDB();
        
        // Load models
        await loadModels();
        
        // Load users from IndexedDB
        const savedUsers = await getAllUsersFromDB();
        setUsers(savedUsers);
        
        setIsLoading(false);
      } catch (err) {
        console.error(err);
        setRegisterStatus({ type: 'error', msg: 'Erro ao inicializar sistema. Verifique logs.' });
        setIsLoading(false); 
      }
    };
    init();
  }, []);

  // Handle Registration
  const handleRegisterCapture = async (imageSrc: string) => {
    if (!registerName.trim()) {
      setRegisterStatus({ type: 'error', msg: 'Por favor, digite um nome antes de capturar.' });
      return;
    }

    setProcessingRegister(true);
    setRegisterStatus({ type: 'info', msg: 'Analisando biometria facial...' });

    try {
      // Create an image element to process
      const img = document.createElement('img');
      img.src = imageSrc;
      await new Promise((resolve) => (img.onload = resolve));

      const detection = await detectFace(img);

      if (!detection) {
        setRegisterStatus({ type: 'error', msg: 'Nenhum rosto detectado. Tente novamente com melhor iluminação.' });
        setProcessingRegister(false);
        return;
      }

      if (detection.score < 0.8) {
         setRegisterStatus({ type: 'error', msg: 'Qualidade da face baixa. Aproxime-se da câmera.' });
         setProcessingRegister(false);
         return;
      }

      // Save User
      const newUser: RegisteredUser = {
        id: generateId(),
        name: registerName.trim(),
        descriptors: Array.from(detection.descriptor), // Convert Float32Array to regular array for storage
        photoUrl: imageSrc,
        createdAt: Date.now()
      };

      // Update UI State
      const updatedUsers = [...users, newUser];
      setUsers(updatedUsers);
      
      // Persist to IndexedDB
      await saveUserToDB(newUser);

      setRegisterStatus({ type: 'success', msg: `Usuário ${newUser.name} cadastrado com sucesso!` });
      setRegisterName('');
    } catch (error) {
      console.error(error);
      setRegisterStatus({ type: 'error', msg: 'Erro ao processar/salvar imagem.' });
    } finally {
      setProcessingRegister(false);
    }
  };

  // Handle Recognition Frame Processing
  const handleRecognitionFrame = async (video: HTMLVideoElement) => {
    // Throttle processing to save CPU/Battery (every 200ms)
    const now = Date.now();
    if (now - lastProcessedTime.current < 200) return;
    lastProcessedTime.current = now;

    if (users.length === 0) {
        setDetectedBoxes([]);
        return;
    }

    const matcher = createFaceMatcher(users);
    if (!matcher) return;

    try {
      // We only detect logic here, drawing happens in WebcamView based on `detectedBoxes`
      const matches = await matchFace(video, matcher);
      
      // Map matches to our DetectionBox type
      const boxes: DetectionBox[] = matches.map((m: any) => ({
        x: m.x,
        y: m.y,
        width: m.width,
        height: m.height,
        label: m.label,
        distance: m.distance,
        color: m.rawLabel === 'unknown' ? '#ef4444' : '#10b981'
      }));
      
      setDetectedBoxes(boxes);

    } catch (err) {
      // Silent fail on frame error
    }
  };

  const deleteUser = async (id: string) => {
    try {
      await deleteUserFromDB(id);
      const updated = users.filter(u => u.id !== id);
      setUsers(updated);
    } catch (error) {
      console.error("Failed to delete user", error);
    }
  };

  if (isLoading) {
    return (
      <div className="min-h-screen bg-black flex flex-col items-center justify-center text-white space-y-4">
        <div className="w-16 h-16 border-4 border-blue-600 border-t-transparent rounded-full animate-spin"></div>
        <h2 className="text-xl font-mono text-blue-400">Inicializando SecureFace...</h2>
        <p className="text-zinc-500 text-sm">Carregando banco de dados e modelos de IA locais</p>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-zinc-950 text-zinc-100 font-sans selection:bg-blue-500/30">
      {/* Header */}
      <header className="border-b border-zinc-800 bg-zinc-900/50 backdrop-blur-md sticky top-0 z-50">
        <div className="max-w-5xl mx-auto px-4 h-16 flex items-center justify-between">
          <div className="flex items-center gap-2 text-blue-500">
            <ShieldCheck className="w-8 h-8" />
            <h1 className="text-xl font-bold tracking-tighter text-white">SecureFace<span className="text-blue-500">.Local</span></h1>
          </div>
          <div className="text-xs text-zinc-500 hidden sm:block">
            v1.1.0 • IndexedDB Storage • No Cloud
          </div>
        </div>
      </header>

      <main className="max-w-5xl mx-auto px-4 py-8">
        
        {/* Stats / Info */}
        <div className="grid grid-cols-1 md:grid-cols-3 gap-4 mb-8">
            <div className="bg-zinc-900 border border-zinc-800 p-4 rounded-lg flex items-center justify-between">
                <div>
                    <p className="text-zinc-400 text-xs uppercase tracking-wider">Base de Dados</p>
                    <p className="text-2xl font-bold text-white">{users.length} <span className="text-sm font-normal text-zinc-500">Faces</span></p>
                </div>
                <Database className="text-zinc-700 w-8 h-8" />
            </div>
            <div className="bg-zinc-900 border border-zinc-800 p-4 rounded-lg flex items-center justify-between">
                 <div>
                    <p className="text-zinc-400 text-xs uppercase tracking-wider">Status do Modelo</p>
                    <p className="text-lg font-bold text-emerald-400">Ativo</p>
                </div>
                <div className="w-3 h-3 bg-emerald-500 rounded-full shadow-[0_0_10px_rgba(16,185,129,0.5)]"></div>
            </div>
             <div className="bg-zinc-900 border border-zinc-800 p-4 rounded-lg flex items-center justify-between">
                 <div>
                    <p className="text-zinc-400 text-xs uppercase tracking-wider">Privacidade</p>
                    <p className="text-lg font-bold text-blue-400">100% Local</p>
                </div>
                <ShieldCheck className="text-zinc-700 w-8 h-8" />
            </div>
        </div>

        {/* Tabs */}
        <div className="flex space-x-1 bg-zinc-900/50 p-1 rounded-lg mb-6 border border-zinc-800 w-fit mx-auto">
          <button
            onClick={() => setActiveTab('register')}
            className={`flex items-center gap-2 px-6 py-2 rounded-md text-sm font-medium transition-all ${
              activeTab === 'register' 
                ? 'bg-zinc-800 text-white shadow-lg ring-1 ring-zinc-700' 
                : 'text-zinc-400 hover:text-zinc-200 hover:bg-zinc-800/50'
            }`}
          >
            <Plus className="w-4 h-4" /> Cadastro
          </button>
          <button
            onClick={() => setActiveTab('recognize')}
            className={`flex items-center gap-2 px-6 py-2 rounded-md text-sm font-medium transition-all ${
              activeTab === 'recognize' 
                ? 'bg-zinc-800 text-white shadow-lg ring-1 ring-zinc-700' 
                : 'text-zinc-400 hover:text-zinc-200 hover:bg-zinc-800/50'
            }`}
          >
            <ScanFace className="w-4 h-4" /> Reconhecimento
          </button>
          <button
            onClick={() => setActiveTab('users')}
            className={`flex items-center gap-2 px-6 py-2 rounded-md text-sm font-medium transition-all ${
              activeTab === 'users' 
                ? 'bg-zinc-800 text-white shadow-lg ring-1 ring-zinc-700' 
                : 'text-zinc-400 hover:text-zinc-200 hover:bg-zinc-800/50'
            }`}
          >
            <Users className="w-4 h-4" /> Usuários
          </button>
        </div>

        {/* Content */}
        <div className="bg-zinc-900/30 border border-zinc-800 rounded-2xl p-6 backdrop-blur-sm">
          
          {activeTab === 'register' && (
            <div className="flex flex-col items-center space-y-6">
              <div className="text-center max-w-md">
                <h2 className="text-2xl font-bold mb-2">Cadastro Biométrico</h2>
                <p className="text-zinc-400 text-sm">Posicione o rosto na área da câmera. Certifique-se que a iluminação está adequada.</p>
              </div>

              <div className="w-full max-w-md space-y-4">
                <div className="relative">
                    <input
                        type="text"
                        value={registerName}
                        onChange={(e) => setRegisterName(e.target.value)}
                        placeholder="Nome completo do usuário"
                        className="w-full bg-zinc-950 border border-zinc-700 rounded-lg px-4 py-3 text-white placeholder-zinc-600 focus:outline-none focus:ring-2 focus:ring-blue-500/50 focus:border-blue-500 transition-all"
                    />
                </div>
                
                <WebcamView 
                    mode="register" 
                    onCapture={handleRegisterCapture} 
                    isProcessing={processingRegister}
                />

                {registerStatus && (
                    <div className={`p-4 rounded-lg text-sm flex items-center gap-3 ${
                        registerStatus.type === 'error' ? 'bg-red-500/10 text-red-400 border border-red-500/20' :
                        registerStatus.type === 'success' ? 'bg-emerald-500/10 text-emerald-400 border border-emerald-500/20' :
                        'bg-blue-500/10 text-blue-400 border border-blue-500/20'
                    }`}>
                        <div className={`w-2 h-2 rounded-full ${
                             registerStatus.type === 'error' ? 'bg-red-500' :
                             registerStatus.type === 'success' ? 'bg-emerald-500' : 'bg-blue-500'
                        }`} />
                        {registerStatus.msg}
                    </div>
                )}
              </div>
            </div>
          )}

          {activeTab === 'recognize' && (
             <div className="flex flex-col items-center space-y-6">
                <div className="text-center max-w-md">
                    <h2 className="text-2xl font-bold mb-2 text-emerald-400">Monitoramento Ativo</h2>
                    <p className="text-zinc-400 text-sm">Identificando rostos em tempo real usando vetores de características locais.</p>
                </div>
                <WebcamView 
                    mode="recognize" 
                    onFrameProcess={handleRecognitionFrame}
                    boxes={detectedBoxes}
                />
                 <div className="grid grid-cols-2 gap-4 w-full max-w-[640px]">
                    {detectedBoxes.map((box, idx) => (
                        <div key={idx} className="bg-zinc-800 p-3 rounded border border-zinc-700 flex items-center justify-between animate-in fade-in slide-in-from-bottom-2">
                             <span className="font-mono text-sm text-zinc-300">Target #{idx + 1}</span>
                             <span className={`font-bold ${box.label.includes('unknown') ? 'text-red-400' : 'text-emerald-400'}`}>
                                {box.label.split(' ')[0]}
                             </span>
                        </div>
                    ))}
                    {detectedBoxes.length === 0 && (
                         <div className="col-span-2 text-center text-zinc-600 text-sm italic py-2">
                            Aguardando detecção...
                         </div>
                    )}
                 </div>
             </div>
          )}

          {activeTab === 'users' && (
            <div className="space-y-6">
               <div className="flex justify-between items-center mb-4">
                   <h2 className="text-2xl font-bold">Usuários Cadastrados</h2>
                   <span className="text-sm text-zinc-500">{users.length} registros (IndexedDB)</span>
               </div>
               
               {users.length === 0 ? (
                   <div className="text-center py-12 border-2 border-dashed border-zinc-800 rounded-xl">
                       <Users className="w-12 h-12 text-zinc-700 mx-auto mb-3" />
                       <p className="text-zinc-500">Nenhum usuário registrado ainda.</p>
                   </div>
               ) : (
                   <div className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-3 gap-4">
                       {users.map(user => (
                           <div key={user.id} className="bg-zinc-950 border border-zinc-800 rounded-lg p-4 flex items-center space-x-4 group hover:border-zinc-700 transition-colors">
                               <img 
                                src={user.photoUrl} 
                                alt={user.name} 
                                className="w-12 h-12 rounded-full object-cover ring-2 ring-zinc-800 group-hover:ring-blue-500/50 transition-all"
                               />
                               <div className="flex-1 min-w-0">
                                   <p className="text-white font-medium truncate">{user.name}</p>
                                   <p className="text-xs text-zinc-500 font-mono">ID: {user.id.slice(0,8)}...</p>
                               </div>
                               <button 
                                onClick={() => deleteUser(user.id)}
                                className="p-2 text-zinc-600 hover:text-red-400 hover:bg-red-400/10 rounded-md transition-colors"
                                title="Remover usuário"
                               >
                                   <Trash2 className="w-4 h-4" />
                               </button>
                           </div>
                       ))}
                   </div>
               )}
            </div>
          )}

        </div>
      </main>
    </div>
  );
}