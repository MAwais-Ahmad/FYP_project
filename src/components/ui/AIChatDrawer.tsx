import { useState, useRef, useEffect } from 'react';
import { sendChatMessage } from '../../services/api';

interface AIChatDrawerProps {
    recordContext?: any;
    isOpen?: boolean;
    onToggle?: () => void;
}

interface ChatMessage {
    id: string;
    role: 'user' | 'assistant';
    content: string;
    timestamp: Date;
}

export function AIChatDrawer({ recordContext }: AIChatDrawerProps) {
    const [isOpen, setIsOpen] = useState(false);
    const [messages, setMessages] = useState<ChatMessage[]>([
        {
            id: 'init-1',
            role: 'assistant',
            content: '👋 Hello! I am your **AITA AI Diagnostic Tutor & Assistant**.\n\nI can analyze your cognitive profile, explain specific questions, or look up student results for teachers (e.g. *"Tell me about Haris in Physics Test 1"*). How can I help you today?',
            timestamp: new Date(),
        },
    ]);
    const [input, setInput] = useState('');
    const [isSending, setIsSending] = useState(false);
    const messagesEndRef = useRef<HTMLDivElement>(null);

    const scrollToBottom = () => {
        messagesEndRef.current?.scrollIntoView({ behavior: 'smooth' });
    };

    useEffect(() => {
        if (isOpen) {
            scrollToBottom();
        }
    }, [messages, isOpen]);

    const handleSend = async (textToSend?: string) => {
        const query = (textToSend || input).trim();
        if (!query || isSending) return;

        const userMsg: ChatMessage = {
            id: `msg-${Date.now()}`,
            role: 'user',
            content: query,
            timestamp: new Date(),
        };

        setMessages(prev => [...prev, userMsg]);
        if (!textToSend) setInput('');
        setIsSending(true);

        const apiPayload = [...messages, userMsg].map(m => ({
            role: m.role,
            content: m.content,
        }));

        const result = await sendChatMessage(apiPayload, recordContext);
        setIsSending(false);

        if (result.success && result.message) {
            const aiMsg: ChatMessage = {
                id: `msg-${Date.now() + 1}`,
                role: 'assistant',
                content: result.message,
                timestamp: new Date(),
            };
            setMessages(prev => [...prev, aiMsg]);
        } else {
            const errorMsg: ChatMessage = {
                id: `msg-${Date.now() + 1}`,
                role: 'assistant',
                content: `⚠️ ${result.error || 'Unable to connect to AI Advisor. Please try again.'}`,
                timestamp: new Date(),
            };
            setMessages(prev => [...prev, errorMsg]);
        }
    };

    // Quick-prompt chips
    const quickPrompts = [
        '💡 Why did I get this cognitive profile?',
        '⚡ How can I improve my response speed?',
        '🔍 Explain Question 1 to me',
        '📊 Summarize Haris result from Physics Test 1',
    ];

    return (
        <>
            {/* Global Floating Trigger Button */}
            <button
                onClick={() => setIsOpen(!isOpen)}
                className="fixed bottom-6 right-6 z-40 flex items-center gap-2.5 px-4 py-3 rounded-full bg-gradient-to-r from-primary-500 to-accent-500 text-white font-medium text-sm shadow-2xl hover:scale-105 active:scale-95 transition-all cursor-pointer border border-white/20"
                title="Open AI Tutor & Intelligence Advisor"
            >
                <span className="text-xl animate-pulse">🤖</span>
                <span className="hidden md:inline font-bold">AI Advisor</span>
            </button>

            {/* Slide-out Glassmorphic Chat Drawer */}
            {isOpen && (
                <div className="fixed inset-y-0 right-0 w-full sm:w-[420px] z-50 bg-dark-900/95 backdrop-blur-2xl border-l border-white/10 shadow-2xl flex flex-col animate-slideLeft">
                    {/* Header */}
                    <div className="p-4 border-b border-white/10 flex items-center justify-between bg-white/5">
                        <div className="flex items-center gap-3">
                            <div className="w-10 h-10 rounded-full bg-gradient-to-br from-primary-500 to-accent-500 flex items-center justify-center text-xl shadow-lg">
                                🤖
                            </div>
                            <div>
                                <h3 className="font-bold text-sm text-white">AITA AI Advisor</h3>
                                <p className="text-[10px] text-green-400 flex items-center gap-1">
                                    <span className="w-1.5 h-1.5 rounded-full bg-green-400 animate-ping"></span>
                                    <span>Online • Intelligent Tutor</span>
                                </p>
                            </div>
                        </div>
                        <button
                            onClick={() => setIsOpen(false)}
                            className="w-8 h-8 rounded-full bg-white/5 hover:bg-white/10 text-white/50 hover:text-white flex items-center justify-center text-sm transition-all"
                        >
                            ✕
                        </button>
                    </div>

                    {/* Active Context Banner (if viewing a record) */}
                    {recordContext && (
                        <div className="bg-primary-500/10 border-b border-primary-500/20 px-4 py-2 text-xs text-primary-300 flex items-center justify-between">
                            <span className="truncate">
                                📌 Analyzing: <strong>{recordContext.primaryName || recordContext.examTitle || 'Current Result'}</strong>
                            </span>
                            <span className="shrink-0 text-[10px] bg-primary-500/20 px-1.5 py-0.5 rounded">Active</span>
                        </div>
                    )}

                    {/* Chat Messages */}
                    <div className="flex-1 overflow-y-auto p-4 space-y-4">
                        {messages.map(msg => (
                            <div
                                key={msg.id}
                                className={`flex flex-col ${msg.role === 'user' ? 'items-end' : 'items-start'}`}
                            >
                                <div
                                    className={`max-w-[88%] p-3.5 rounded-2xl text-xs leading-relaxed space-y-1 ${
                                        msg.role === 'user'
                                            ? 'bg-gradient-to-r from-primary-500 to-primary-600 text-white rounded-br-none shadow-md'
                                            : 'bg-white/10 text-white/90 border border-white/10 rounded-bl-none shadow-md'
                                    }`}
                                >
                                    <div className="whitespace-pre-wrap">{msg.content}</div>
                                </div>
                                <span className="text-[9px] text-white/30 px-1 mt-1">
                                    {msg.timestamp.toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}
                                </span>
                            </div>
                        ))}

                        {isSending && (
                            <div className="flex items-start gap-2">
                                <div className="p-3.5 rounded-2xl bg-white/10 border border-white/10 text-xs text-white/60 flex items-center gap-2 rounded-bl-none">
                                    <span className="animate-spin">🤖</span>
                                    <span>AI is thinking...</span>
                                </div>
                            </div>
                        )}
                        <div ref={messagesEndRef} />
                    </div>

                    {/* Quick Prompts */}
                    <div className="p-2 border-t border-white/5 bg-black/20 flex gap-1.5 overflow-x-auto no-scrollbar">
                        {quickPrompts.map((prompt, i) => (
                            <button
                                key={i}
                                onClick={() => handleSend(prompt)}
                                className="text-[11px] bg-white/5 hover:bg-white/10 text-white/70 hover:text-white px-2.5 py-1.5 rounded-full shrink-0 border border-white/5 transition-all"
                            >
                                {prompt}
                            </button>
                        ))}
                    </div>

                    {/* Input Field */}
                    <div className="p-3 border-t border-white/10 bg-white/5">
                        <form
                            onSubmit={e => {
                                e.preventDefault();
                                handleSend();
                            }}
                            className="flex items-center gap-2"
                        >
                            <input
                                type="text"
                                value={input}
                                onChange={e => setInput(e.target.value)}
                                placeholder="Ask AI Advisor anything..."
                                className="text-input text-xs !py-2.5 !px-3"
                                disabled={isSending}
                            />
                            <button
                                type="submit"
                                disabled={!input.trim() || isSending}
                                className="btn-primary !py-2.5 !px-4 text-xs shrink-0 disabled:opacity-50"
                            >
                                Send
                            </button>
                        </form>
                    </div>
                </div>
            )}
        </>
    );
}
