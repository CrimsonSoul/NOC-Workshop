import React, { useRef, useState, useEffect } from 'react';
import type { WebviewTag } from 'electron';
import { ToolbarButton } from '../components/ToolbarButton';
import { CollapsibleHeader } from '../components/CollapsibleHeader';

type AIService = 'gemini' | 'chatgpt';

const AI_SERVICES: { id: AIService; label: string; url: string }[] = [
    { id: 'gemini', label: 'Gemini', url: 'https://gemini.google.com/app' },
    { id: 'chatgpt', label: 'ChatGPT', url: 'https://chatgpt.com' },
];

// Chrome user agent to ensure sites treat webview as a regular browser
const CHROME_USER_AGENT =
    'Mozilla/5.0 (Macintosh; Intel Mac OS X 10_15_7) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/120.0.0.0 Safari/537.36';

export const AIChatTab: React.FC = () => {
    const [activeService, setActiveService] = useState<AIService>('gemini');
    const [isLoading, setIsLoading] = useState<Record<AIService, boolean>>({
        gemini: false,
        chatgpt: false,
    });

    const geminiRef = useRef<WebviewTag>(null);
    const chatgptRef = useRef<WebviewTag>(null);

    const getWebviewRef = (service: AIService) => {
        return service === 'gemini' ? geminiRef : chatgptRef;
    };

    // Attach webview event listeners
    useEffect(() => {
        const gemini = geminiRef.current;
        const chatgpt = chatgptRef.current;

        const handleGeminiLoadStart = () => setIsLoading(prev => ({ ...prev, gemini: true }));
        const handleGeminiLoadStop = () => setIsLoading(prev => ({ ...prev, gemini: false }));
        const handleChatgptLoadStart = () => setIsLoading(prev => ({ ...prev, chatgpt: true }));
        const handleChatgptLoadStop = () => setIsLoading(prev => ({ ...prev, chatgpt: false }));

        gemini?.addEventListener('did-start-loading', handleGeminiLoadStart);
        gemini?.addEventListener('did-stop-loading', handleGeminiLoadStop);
        chatgpt?.addEventListener('did-start-loading', handleChatgptLoadStart);
        chatgpt?.addEventListener('did-stop-loading', handleChatgptLoadStop);

        return () => {
            gemini?.removeEventListener('did-start-loading', handleGeminiLoadStart);
            gemini?.removeEventListener('did-stop-loading', handleGeminiLoadStop);
            chatgpt?.removeEventListener('did-start-loading', handleChatgptLoadStart);
            chatgpt?.removeEventListener('did-stop-loading', handleChatgptLoadStop);
        };
    }, []);

    const handleRefresh = () => {
        const webview = getWebviewRef(activeService).current;
        if (webview) {
            webview.reloadIgnoringCache();
        }
    };

    return (
        <div
            style={{
                height: '100%',
                display: 'flex',
                flexDirection: 'column',
                padding: '20px 24px 24px 24px',
                background: 'var(--color-bg-app)',
                overflow: 'hidden',
            }}
        >
            {/* Header with integrated tab switcher */}
            <CollapsibleHeader
                title="AI Chat"
                subtitle="Private session • Data clears when you leave"
                isCollapsed={true}
            >
                {/* Service Tabs */}
                <div style={{ display: 'flex', gap: '4px', marginRight: '12px' }}>
                    {AI_SERVICES.map((service) => (
                        <button
                            key={service.id}
                            onClick={() => setActiveService(service.id)}
                            style={{
                                padding: '6px 14px',
                                fontSize: '11px',
                                fontWeight: 700,
                                textTransform: 'uppercase',
                                letterSpacing: '0.05em',
                                background:
                                    activeService === service.id
                                        ? 'var(--color-accent-blue)'
                                        : 'rgba(255, 255, 255, 0.05)',
                                color:
                                    activeService === service.id
                                        ? 'white'
                                        : 'var(--color-text-tertiary)',
                                border: 'none',
                                borderRadius: '6px',
                                cursor: 'pointer',
                                transition: 'all 0.2s ease',
                            }}
                            onMouseEnter={(e) => {
                                if (activeService !== service.id) {
                                    e.currentTarget.style.background = 'rgba(255, 255, 255, 0.08)';
                                    e.currentTarget.style.color = 'var(--color-text-secondary)';
                                }
                            }}
                            onMouseLeave={(e) => {
                                if (activeService !== service.id) {
                                    e.currentTarget.style.background = 'rgba(255, 255, 255, 0.05)';
                                    e.currentTarget.style.color = 'var(--color-text-tertiary)';
                                }
                            }}
                        >
                            {service.label}
                        </button>
                    ))}
                </div>

                <ToolbarButton
                    onClick={handleRefresh}
                    label={isLoading[activeService] ? 'LOADING' : 'REFRESH'}
                    style={{ padding: '8px 16px', fontSize: '11px' }}
                    icon={
                        <svg
                            width="12"
                            height="12"
                            viewBox="0 0 24 24"
                            fill="none"
                            stroke="currentColor"
                            strokeWidth="2"
                            strokeLinecap="round"
                            strokeLinejoin="round"
                            style={{
                                animation: isLoading[activeService]
                                    ? 'spin 1s linear infinite'
                                    : 'none',
                            }}
                        >
                            <path d="M23 4v6h-6" />
                            <path d="M1 20v-6h6" />
                            <path d="M3.51 9a9 9 0 0 1 14.85-3.36L23 10M1 14l4.64 4.36A9 9 0 0 0 20.49 15" />
                        </svg>
                    }
                />
            </CollapsibleHeader>

            {/* Webview Container */}
            <div
                style={{
                    flex: 1,
                    position: 'relative',
                    background: 'black',
                    overflow: 'hidden',
                    borderRadius: '12px',
                    border: 'var(--border-subtle)',
                }}
            >
                {/* Gemini Webview - Always mounted, visibility controlled */}
                <webview
                    ref={geminiRef}
                    src={AI_SERVICES[0].url}
                    partition="ai-chat-session"
                    useragent={CHROME_USER_AGENT}
                    style={{
                        position: 'absolute',
                        top: 0,
                        left: 0,
                        width: '100%',
                        height: '100%',
                        border: 'none',
                        background: 'white',
                        visibility: activeService === 'gemini' ? 'visible' : 'hidden',
                    }}
                />

                {/* ChatGPT Webview - Always mounted, visibility controlled */}
                <webview
                    ref={chatgptRef}
                    src={AI_SERVICES[1].url}
                    partition="ai-chat-session"
                    useragent={CHROME_USER_AGENT}
                    style={{
                        position: 'absolute',
                        top: 0,
                        left: 0,
                        width: '100%',
                        height: '100%',
                        border: 'none',
                        background: 'white',
                        visibility: activeService === 'chatgpt' ? 'visible' : 'hidden',
                    }}
                />
            </div>

            <style>{`
        @keyframes spin { from { transform: rotate(0deg); } to { transform: rotate(360deg); } }
      `}</style>
        </div>
    );
};
