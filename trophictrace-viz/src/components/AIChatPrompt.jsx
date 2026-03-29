import { useState, useRef, useEffect, useCallback } from 'react'
import { Sparkles, Send, X } from 'lucide-react'
import { answerQuery } from '../utils/chatEngine'

// Simple markdown-ish renderer for bold and newlines
function renderMarkdown(text) {
  if (!text) return null
  const parts = text.split('\n')
  return parts.map((line, i) => {
    // Bold: **text**
    const segments = line.split(/(\*\*[^*]+\*\*)/)
    const rendered = segments.map((seg, j) => {
      if (seg.startsWith('**') && seg.endsWith('**')) {
        return <strong key={j} style={{ color: 'var(--text-primary)', fontWeight: 600 }}>{seg.slice(2, -2)}</strong>
      }
      return seg
    })
    return (
      <span key={i}>
        {i > 0 && <br />}
        {rendered}
      </span>
    )
  })
}

export default function AIChatPrompt({ data, hoveredSegment }) {
  const [proximity, setProximity] = useState(0)
  const [isHovered, setIsHovered] = useState(false)
  const [isExpanded, setIsExpanded] = useState(false)
  const [query, setQuery] = useState('')
  const [messages, setMessages] = useState([])
  const [loading, setLoading] = useState(false)
  const buttonRef = useRef(null)
  const inputRef = useRef(null)
  const containerRef = useRef(null)
  const messagesEndRef = useRef(null)

  // Track mouse proximity to button
  useEffect(() => {
    const handleMouseMove = (e) => {
      if (!buttonRef.current) return
      const rect = buttonRef.current.getBoundingClientRect()
      const centerX = rect.left + rect.width / 2
      const centerY = rect.top + rect.height / 2
      const dist = Math.sqrt((e.clientX - centerX) ** 2 + (e.clientY - centerY) ** 2)
      const prox = dist < 200 ? Math.max(0.15, 1 - dist / 200) : 0.15
      setProximity(prox)
    }
    window.addEventListener('mousemove', handleMouseMove, { passive: true })
    return () => window.removeEventListener('mousemove', handleMouseMove)
  }, [])

  // Focus input when expanded
  useEffect(() => {
    if (isExpanded && inputRef.current) {
      inputRef.current.focus()
    }
  }, [isExpanded])

  // Scroll to bottom on new message
  useEffect(() => {
    if (messagesEndRef.current) {
      messagesEndRef.current.scrollIntoView({ behavior: 'smooth' })
    }
  }, [messages])

  // Click outside to collapse
  useEffect(() => {
    if (!isExpanded) return
    const handleClick = (e) => {
      if (containerRef.current && !containerRef.current.contains(e.target)) {
        setIsExpanded(false)
        setIsHovered(false)
      }
    }
    document.addEventListener('mousedown', handleClick)
    return () => document.removeEventListener('mousedown', handleClick)
  }, [isExpanded])

  const handleSubmit = async () => {
    if (!query.trim() || loading) return
    const userQuery = query.trim()
    setQuery('')
    setMessages(prev => [...prev, { role: 'user', text: userQuery }])
    setLoading(true)

    try {
      const answer = await answerQuery(userQuery, data)
      setMessages(prev => [...prev, { role: 'assistant', text: answer }])
    } catch (err) {
      setMessages(prev => [...prev, { role: 'assistant', text: `Sorry, something went wrong: ${err.message}` }])
    } finally {
      setLoading(false)
    }
  }

  const handleExpand = () => {
    setIsExpanded(true)
  }

  const baseOpacity = isExpanded ? 1 : proximity

  return (
    <div
      ref={containerRef}
      style={{
        position: 'absolute',
        bottom: '2rem',
        left: '50%',
        transform: 'translateX(-50%)',
        zIndex: 15,
        display: 'flex',
        flexDirection: 'column',
        alignItems: 'center',
        gap: '0.5rem',
      }}
    >
      {/* Chat panel */}
      {isExpanded && messages.length > 0 && (
        <div
          style={{
            width: '460px',
            maxHeight: '340px',
            overflowY: 'auto',
            background: 'var(--bg-surface)',
            border: '1px solid var(--border)',
            borderRadius: '12px',
            padding: '0.75rem',
            boxShadow: '0 4px 24px rgba(0, 0, 0, 0.4)',
            animation: 'chatEnter 200ms ease-out',
            display: 'flex',
            flexDirection: 'column',
            gap: '0.5rem',
          }}
        >
          <style>{`@keyframes chatEnter { from { opacity: 0; transform: translateY(8px); } to { opacity: 1; transform: translateY(0); } }`}</style>

          {messages.map((msg, i) => (
            <div
              key={i}
              style={{
                alignSelf: msg.role === 'user' ? 'flex-end' : 'flex-start',
                maxWidth: '90%',
                background: msg.role === 'user' ? 'rgba(46,184,114,0.12)' : 'rgba(255,255,255,0.04)',
                border: `1px solid ${msg.role === 'user' ? 'rgba(46,184,114,0.2)' : 'var(--border)'}`,
                borderRadius: msg.role === 'user' ? '12px 12px 4px 12px' : '12px 12px 12px 4px',
                padding: '0.625rem 0.875rem',
                fontSize: '0.8125rem',
                fontFamily: 'var(--font-body)',
                color: 'var(--text-secondary)',
                lineHeight: 1.55,
              }}
            >
              {msg.role === 'assistant' ? renderMarkdown(msg.text) : msg.text}
            </div>
          ))}

          {loading && (
            <div style={{
              alignSelf: 'flex-start',
              padding: '0.5rem 0.75rem',
              fontSize: '0.75rem',
              color: 'var(--text-tertiary)',
              fontStyle: 'italic',
            }}>
              Thinking...
            </div>
          )}

          <div ref={messagesEndRef} />
        </div>
      )}

      {/* Input bar */}
      <div
        ref={buttonRef}
        onMouseEnter={() => {
          setIsHovered(true)
          if (!isExpanded) handleExpand()
        }}
        onMouseLeave={() => {
          if (!isExpanded) setIsHovered(false)
        }}
        style={{
          width: isExpanded ? '460px' : '48px',
          height: '48px',
          borderRadius: '24px',
          background: 'var(--bg-surface)',
          border: '1px solid var(--border)',
          display: 'flex',
          alignItems: 'center',
          overflow: 'hidden',
          transition: 'width 250ms ease-out, opacity 200ms ease-out',
          opacity: baseOpacity,
          boxShadow: '0 4px 16px rgba(0, 0, 0, 0.3)',
          cursor: isExpanded ? 'text' : 'pointer',
        }}
      >
        {/* Icon */}
        <div
          style={{
            width: '48px',
            height: '48px',
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'center',
            flexShrink: 0,
            color: loading ? 'var(--accent)' : 'var(--text-secondary)',
            transition: 'color 200ms',
          }}
        >
          <Sparkles size={18} strokeWidth={1.5} style={loading ? { animation: 'pulse 1s ease-in-out infinite' } : {}} />
          {loading && (
            <style>{`@keyframes pulse { 0%, 100% { opacity: 1; } 50% { opacity: 0.4; } }`}</style>
          )}
        </div>

        {/* Input */}
        {isExpanded && (
          <>
            <input
              ref={inputRef}
              value={query}
              onChange={(e) => setQuery(e.target.value)}
              onKeyDown={(e) => {
                if (e.key === 'Enter') handleSubmit()
              }}
              placeholder={messages.length === 0 ? 'Ask about PFAS levels, fish safety, locations...' : 'Ask a follow-up...'}
              style={{
                flex: 1,
                background: 'none',
                border: 'none',
                outline: 'none',
                color: 'var(--text-primary)',
                fontFamily: 'var(--font-body)',
                fontSize: '0.875rem',
              }}
            />
            {query.trim() && (
              <button
                onClick={handleSubmit}
                style={{
                  width: '36px',
                  height: '36px',
                  marginRight: '6px',
                  borderRadius: '50%',
                  background: 'rgba(46,184,114,0.15)',
                  border: '1px solid rgba(46,184,114,0.3)',
                  display: 'flex',
                  alignItems: 'center',
                  justifyContent: 'center',
                  cursor: 'pointer',
                  color: '#2EB872',
                  flexShrink: 0,
                }}
              >
                <Send size={14} strokeWidth={2} />
              </button>
            )}
            {messages.length > 0 && !query.trim() && (
              <button
                onClick={() => { setMessages([]); setQuery('') }}
                style={{
                  width: '36px',
                  height: '36px',
                  marginRight: '6px',
                  borderRadius: '50%',
                  background: 'rgba(255,255,255,0.05)',
                  border: '1px solid var(--border)',
                  display: 'flex',
                  alignItems: 'center',
                  justifyContent: 'center',
                  cursor: 'pointer',
                  color: 'var(--text-tertiary)',
                  flexShrink: 0,
                }}
                title="Clear chat"
              >
                <X size={14} strokeWidth={2} />
              </button>
            )}
          </>
        )}
      </div>
    </div>
  )
}
