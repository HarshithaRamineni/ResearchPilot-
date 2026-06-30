"use client";

import React, { useState, useEffect, useRef } from "react";
import { 
  FolderPlus, 
  FileText, 
  Send, 
  Upload, 
  MessageSquare, 
  Loader2, 
  Database, 
  Folder, 
  Sparkles, 
  ArrowRight,
  BookOpen,
  Info
} from "lucide-react";

interface Workspace {
  id: string;
  name: string;
  description?: string;
  created_at: string;
}

interface Message {
  sender: "user" | "assistant";
  content: string;
  sources?: string[];
}

export default function Home() {
  const [workspaces, setWorkspaces] = useState<Workspace[]>([]);
  const [activeWorkspace, setActiveWorkspace] = useState<Workspace | null>(null);
  const [papers, setPapers] = useState<any[]>([]);
  const [selectedFile, setSelectedFile] = useState<File | null>(null);
  const [isUploading, setIsUploading] = useState(false);
  const [workspaceName, setWorkspaceName] = useState("");
  const [workspaceDesc, setWorkspaceDesc] = useState("");
  const [showNewWorkspaceModal, setShowNewWorkspaceModal] = useState(false);
  
  // Chat state
  const [messages, setMessages] = useState<Message[]>([]);
  const [inputMessage, setInputMessage] = useState("");
  const [isGenerating, setIsGenerating] = useState(false);
  const [currentConversationId, setCurrentConversationId] = useState<string | null>(null);

  const messagesEndRef = useRef<HTMLDivElement>(null);
  const fileInputRef = useRef<HTMLInputElement>(null);

  const BACKEND_URL = "http://127.0.0.1:8000";

  // Auto-scroll chat to bottom
  const scrollToBottom = () => {
    messagesEndRef.current?.scrollIntoView({ behavior: "smooth" });
  };

  useEffect(() => {
    scrollToBottom();
  }, [messages, isGenerating]);

  // Load workspaces on startup
  useEffect(() => {
    fetchWorkspaces();
  }, []);

  const fetchWorkspaces = async () => {
    try {
      const res = await fetch(`${BACKEND_URL}/api/papers/workspaces`);
      if (res.ok) {
        const data = await res.json();
        setWorkspaces(data);
        if (data.length > 0 && !activeWorkspace) {
          setActiveWorkspace(data[0]);
        }
      }
    } catch (err) {
      console.error("Error fetching workspaces:", err);
    }
  };

  // Create workspace
  const handleCreateWorkspace = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!workspaceName.trim()) return;

    try {
      const res = await fetch(`${BACKEND_URL}/api/papers/workspaces`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          name: workspaceName,
          description: workspaceDesc
        })
      });

      if (res.ok) {
        const newWs = await res.json();
        setWorkspaces([newWs, ...workspaces]);
        setActiveWorkspace(newWs);
        setWorkspaceName("");
        setWorkspaceDesc("");
        setShowNewWorkspaceModal(false);
      }
    } catch (err) {
      console.error("Error creating workspace:", err);
    }
  };

  // Upload PDF
  const handleUploadFile = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file || !activeWorkspace) return;

    setIsUploading(true);
    const formData = new FormData();
    formData.append("workspace_id", activeWorkspace.id);
    formData.append("file", file);

    try {
      const res = await fetch(`${BACKEND_URL}/api/papers/upload`, {
        method: "POST",
        body: formData
      });

      if (res.ok) {
        const newPaper = await res.json();
        setPapers([newPaper, ...papers]);
      } else {
        alert("Upload failed. Make sure the file is a valid PDF.");
      }
    } catch (err) {
      console.error("Error uploading PDF:", err);
    } finally {
      setIsUploading(false);
      if (fileInputRef.current) fileInputRef.current.value = "";
    }
  };

  // Send message (RAG Chat)
  const handleSendMessage = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!inputMessage.trim() || !activeWorkspace || isGenerating) return;

    const userQuery = inputMessage;
    setInputMessage("");
    
    // Add user message immediately
    setMessages((prev) => [...prev, { sender: "user", content: userQuery }]);
    setIsGenerating(true);

    try {
      const res = await fetch(`${BACKEND_URL}/api/chat`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          workspace_id: activeWorkspace.id,
          conversation_id: currentConversationId,
          message: userQuery
        })
      });

      if (res.ok) {
        const data = await res.json();
        setCurrentConversationId(data.conversation_id);
        setMessages((prev) => [
          ...prev, 
          { 
            sender: "assistant", 
            content: data.answer,
            sources: data.sources
          }
        ]);
      } else {
        setMessages((prev) => [
          ...prev,
          { sender: "assistant", content: "Error: Failed to fetch response from server." }
        ]);
      }
    } catch (err) {
      console.error("Error chatting:", err);
      setMessages((prev) => [
        ...prev,
        { sender: "assistant", content: "Error: Could not reach the backend server." }
      ]);
    } finally {
      setIsGenerating(false);
    }
  };

  return (
    <div className="flex h-screen w-screen bg-[#0b0f19] text-[#e2e8f0] font-sans overflow-hidden">
      
      {/* 1. SIDEBAR PANEL */}
      <aside className="w-80 bg-[#111827] border-r border-[#1f2937] flex flex-col justify-between z-10">
        <div>
          {/* Logo & Header */}
          <div className="p-6 border-b border-[#1f2937] flex items-center gap-3">
            <div className="h-10 w-10 rounded-xl bg-gradient-to-tr from-indigo-500 to-purple-600 flex items-center justify-center shadow-lg shadow-indigo-500/20">
              <Sparkles className="h-5 w-5 text-white animate-pulse" />
            </div>
            <div>
              <h1 className="font-bold text-lg leading-tight bg-gradient-to-r from-white to-[#94a3b8] bg-clip-text text-transparent">
                ResearchPilot
              </h1>
              <span className="text-xs text-indigo-400 font-medium">Cloud RAG Engine</span>
            </div>
          </div>

          {/* Workspace Selection */}
          <div className="p-4">
            <div className="flex justify-between items-center mb-3 px-2">
              <span className="text-xs font-semibold uppercase tracking-wider text-[#6b7280]">
                Workspaces
              </span>
              <button 
                onClick={() => setShowNewWorkspaceModal(true)}
                className="p-1 hover:bg-[#1f2937] rounded-md transition text-indigo-400"
                title="Create Workspace"
              >
                <FolderPlus className="h-4 w-4" />
              </button>
            </div>

            {/* List Workspaces */}
            <div className="space-y-1 max-h-48 overflow-y-auto pr-1">
              {workspaces.map((ws) => (
                <button
                  key={ws.id}
                  onClick={() => {
                    setActiveWorkspace(ws);
                    setMessages([]);
                    setCurrentConversationId(null);
                  }}
                  className={`w-full text-left px-3 py-2.5 rounded-lg flex items-center gap-3 transition text-sm ${
                    activeWorkspace?.id === ws.id 
                      ? "bg-gradient-to-r from-indigo-500/20 to-purple-500/10 border-l-2 border-indigo-500 text-white" 
                      : "hover:bg-[#1f2937] text-[#9ca3af]"
                  }`}
                >
                  <Folder className={`h-4 w-4 ${activeWorkspace?.id === ws.id ? "text-indigo-400" : "text-[#6b7280]"}`} />
                  <div className="truncate">
                    <p className="font-medium truncate">{ws.name}</p>
                    {ws.description && <p className="text-xxs text-[#6b7280] truncate">{ws.description}</p>}
                  </div>
                </button>
              ))}
            </div>
          </div>

          {/* Active Workspace Info & PDF List */}
          {activeWorkspace && (
            <div className="p-4 border-t border-[#1f2937] flex-1">
              <span className="text-xs font-semibold uppercase tracking-wider text-[#6b7280] px-2 block mb-3">
                Workspace Papers
              </span>

              {/* Upload Action */}
              <button
                onClick={() => fileInputRef.current?.click()}
                disabled={isUploading}
                className="w-full py-3 mb-4 rounded-xl border border-dashed border-[#374151] hover:border-indigo-500 transition flex items-center justify-center gap-2 text-sm text-[#9ca3af] hover:text-white bg-[#111827]"
              >
                {isUploading ? (
                  <>
                    <Loader2 className="h-4 w-4 animate-spin text-indigo-400" />
                    <span>Processing PDF...</span>
                  </>
                ) : (
                  <>
                    <Upload className="h-4 w-4 text-indigo-400" />
                    <span>Upload Research Paper</span>
                  </>
                )}
              </button>
              <input 
                type="file" 
                ref={fileInputRef} 
                onChange={handleUploadFile} 
                accept=".pdf" 
                className="hidden" 
              />

              {/* Status information */}
              <div className="bg-[#1f2937]/50 rounded-xl p-3 border border-[#374151]/30">
                <div className="flex items-start gap-2.5">
                  <Database className="h-4 w-4 text-emerald-400 mt-0.5" />
                  <div>
                    <h4 className="text-xs font-medium text-white">Database Connected</h4>
                    <p className="text-xxs text-[#9ca3af] mt-0.5 leading-relaxed">
                      Supabase pgvector with high-speed HNSW indexing is ready.
                    </p>
                  </div>
                </div>
              </div>
            </div>
          )}
        </div>

        {/* User Profile / Stack Footer */}
        <div className="p-4 border-t border-[#1f2937] bg-[#0b0f19]/30">
          <div className="flex items-center gap-3">
            <div className="h-8 w-8 rounded-full bg-gradient-to-tr from-emerald-500 to-teal-600 flex items-center justify-center font-bold text-xs text-white">
              HR
            </div>
            <div>
              <p className="text-xs font-medium text-white">Harshitha Ramineni</p>
              <p className="text-xxs text-indigo-400">Vasavi College of Engg.</p>
            </div>
          </div>
        </div>
      </aside>

      {/* 2. CHAT & RAG ENGINE MAIN INTERFACE */}
      <main className="flex-1 flex flex-col justify-between bg-[#0b0f19] relative">
        {/* Main top navigation */}
        <header className="h-16 border-b border-[#1f2937] px-8 flex items-center justify-between bg-[#111827]/40 backdrop-blur-md z-10">
          <div className="flex items-center gap-3">
            <BookOpen className="h-5 w-5 text-indigo-400" />
            {activeWorkspace ? (
              <div>
                <h2 className="text-sm font-semibold text-white">{activeWorkspace.name}</h2>
                <p className="text-xxs text-[#6b7280]">{activeWorkspace.description || "Interactive Literature review workspace"}</p>
              </div>
            ) : (
              <h2 className="text-sm font-semibold text-white">Select a Workspace</h2>
            )}
          </div>
          <div className="flex items-center gap-4 text-xs font-semibold text-[#6b7280]">
            <span>FastAPI: 8000</span>
            <span className="h-1.5 w-1.5 rounded-full bg-emerald-500 animate-ping"></span>
          </div>
        </header>

        {/* Chat History Panel */}
        <div className="flex-1 overflow-y-auto p-8 space-y-6">
          {messages.length === 0 ? (
            /* Welcome Landing View */
            <div className="h-full flex flex-col items-center justify-center text-center max-w-md mx-auto space-y-6">
              <div className="h-14 w-14 rounded-2xl bg-indigo-500/10 border border-indigo-500/20 flex items-center justify-center text-indigo-400">
                <Sparkles className="h-8 w-8" />
              </div>
              <div>
                <h3 className="text-lg font-bold text-white">Start Chatting with your Literature</h3>
                <p className="text-xs text-[#9ca3af] mt-2 leading-relaxed">
                  Select a workspace on the left sidebar, upload your PDF research papers, and ask questions. 
                  The pipeline will perform vector searches and answer instantly using Cerebras Gemma-4!
                </p>
              </div>
              <div className="flex flex-col gap-2 w-full">
                <div className="flex items-center gap-3 text-left p-3.5 bg-[#111827]/50 rounded-xl border border-[#374151]/20">
                  <span className="text-indigo-400 font-bold text-xs bg-indigo-500/10 px-2 py-1 rounded">1</span>
                  <p className="text-xs text-[#9ca3af]">Upload research paper (PDF format).</p>
                </div>
                <div className="flex items-center gap-3 text-left p-3.5 bg-[#111827]/50 rounded-xl border border-[#374151]/20">
                  <span className="text-indigo-400 font-bold text-xs bg-indigo-500/10 px-2 py-1 rounded">2</span>
                  <p className="text-xs text-[#9ca3af]">Ask questions about the paper or its concepts.</p>
                </div>
              </div>
            </div>
          ) : (
            /* Active Conversation Bubbles */
            <div className="max-w-3xl mx-auto space-y-6">
              {messages.map((msg, index) => (
                <div 
                  key={index}
                  className={`flex ${msg.sender === "user" ? "justify-end" : "justify-start"}`}
                >
                  <div className={`max-w-[85%] rounded-2xl p-4 shadow-md ${
                    msg.sender === "user"
                      ? "bg-gradient-to-tr from-indigo-600 to-purple-600 text-white"
                      : "bg-[#111827] border border-[#1f2937] text-[#e2e8f0]"
                  }`}>
                    {/* Message sender header */}
                    <div className="flex items-center gap-2 mb-1.5">
                      <span className="text-xxs font-semibold uppercase tracking-wider text-indigo-400">
                        {msg.sender === "user" ? "You" : "ResearchPilot Assistant"}
                      </span>
                    </div>

                    {/* Message content */}
                    <p className="text-sm leading-relaxed whitespace-pre-wrap">{msg.content}</p>

                    {/* Citation Sources (RAG specific UI) */}
                    {msg.sources && msg.sources.length > 0 && (
                      <div className="mt-3.5 pt-3 border-t border-[#1f2937]/80 flex flex-wrap items-center gap-2">
                        <span className="text-[10px] font-semibold text-[#6b7280] uppercase tracking-wider">
                          References:
                        </span>
                        {msg.sources.map((src, i) => (
                          <div 
                            key={i} 
                            className="bg-[#1f2937]/80 hover:bg-[#1f2937] border border-[#374151]/50 px-2.5 py-1 rounded-md text-xxs font-medium text-indigo-300 transition cursor-pointer flex items-center gap-1"
                          >
                            <FileText className="h-3 w-3 text-indigo-400" />
                            <span>{src}</span>
                          </div>
                        ))}
                      </div>
                    )}
                  </div>
                </div>
              ))}

              {/* Generating response typing indicator */}
              {isGenerating && (
                <div className="flex justify-start">
                  <div className="bg-[#111827] border border-[#1f2937] rounded-2xl p-4 flex items-center gap-3">
                    <Loader2 className="h-4 w-4 animate-spin text-indigo-400" />
                    <span className="text-xs text-[#9ca3af]">Generating answer using Cerebras Cloud AI...</span>
                  </div>
                </div>
              )}

              <div ref={messagesEndRef} />
            </div>
          )}
        </div>

        {/* Bottom Input Section */}
        <footer className="p-6 border-t border-[#1f2937] bg-[#0b0f19] z-10">
          <div className="max-w-3xl mx-auto">
            <form onSubmit={handleSendMessage} className="relative flex items-center">
              <input
                type="text"
                placeholder={activeWorkspace ? "Ask a question about the papers in this workspace..." : "Create or select a workspace to start..."}
                disabled={!activeWorkspace || isGenerating}
                value={inputMessage}
                onChange={(e) => setInputMessage(e.target.value)}
                className="w-full bg-[#111827] border border-[#1f2937] focus:border-indigo-500 rounded-xl py-4 pl-6 pr-16 text-sm text-white placeholder-[#4b5563] outline-none shadow-inner transition"
              />
              <button
                type="submit"
                disabled={!inputMessage.trim() || isGenerating}
                className="absolute right-3.5 p-2 bg-gradient-to-tr from-indigo-500 to-purple-600 hover:from-indigo-600 hover:to-purple-700 text-white rounded-lg transition disabled:opacity-30 flex items-center justify-center"
              >
                <Send className="h-4 w-4" />
              </button>
            </form>
            <p className="text-center text-[10px] text-[#4b5563] mt-3">
              Cerebras Llama-3.3-70b & Google Gemini-Embedding-001 Hybrid RAG Engine.
            </p>
          </div>
        </footer>

        {/* 3. POPUP MODAL: CREATE WORKSPACE */}
        {showNewWorkspaceModal && (
          <div className="fixed inset-0 bg-black/60 backdrop-blur-sm flex items-center justify-center z-50 animate-fadeIn">
            <div className="bg-[#111827] border border-[#1f2937] rounded-2xl w-full max-w-md p-6 shadow-2xl relative">
              <h3 className="text-base font-bold text-white mb-4">Create New Workspace</h3>
              <form onSubmit={handleCreateWorkspace} className="space-y-4">
                <div>
                  <label className="block text-xs font-semibold text-[#6b7280] uppercase tracking-wider mb-1.5">
                    Project Name
                  </label>
                  <input
                    type="text"
                    required
                    placeholder="e.g. LLM Reasoning Papers"
                    value={workspaceName}
                    onChange={(e) => setWorkspaceName(e.target.value)}
                    className="w-full bg-[#0b0f19] border border-[#1f2937] focus:border-indigo-500 rounded-lg p-3 text-sm text-white outline-none"
                  />
                </div>
                <div>
                  <label className="block text-xs font-semibold text-[#6b7280] uppercase tracking-wider mb-1.5">
                    Description (Optional)
                  </label>
                  <textarea
                    placeholder="Brief details about these research docs..."
                    value={workspaceDesc}
                    onChange={(e) => setWorkspaceDesc(e.target.value)}
                    className="w-full bg-[#0b0f19] border border-[#1f2937] focus:border-indigo-500 rounded-lg p-3 text-sm text-white outline-none h-24 resize-none"
                  />
                </div>
                <div className="flex justify-end gap-3 pt-2">
                  <button
                    type="button"
                    onClick={() => setShowNewWorkspaceModal(false)}
                    className="px-4 py-2 text-xs font-semibold text-[#9ca3af] hover:text-white transition"
                  >
                    Cancel
                  </button>
                  <button
                    type="submit"
                    className="bg-indigo-500 hover:bg-indigo-600 text-white px-4 py-2 text-xs font-semibold rounded-lg transition"
                  >
                    Create Project
                  </button>
                </div>
              </form>
            </div>
          </div>
        )}
      </main>
    </div>
  );
}
