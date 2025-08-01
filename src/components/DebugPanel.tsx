'use client';

import React, { useState, useEffect } from 'react';
import { getDebugLogs, clearDebugLogs } from '@/lib/debug';

export const DebugPanel: React.FC = () => {
  const [logs, setLogs] = useState<Array<{
    timestamp: string;
    message: string;
    data?: string;
    url: string;
  }>>([]);
  const [isExpanded, setIsExpanded] = useState(false);

  useEffect(() => {
    const loadLogs = () => {
      const debugLogs = getDebugLogs();
      setLogs(debugLogs);
    };

    loadLogs();
    // Refresh logs every second to catch updates
    const interval = setInterval(loadLogs, 1000);
    
    return () => clearInterval(interval);
  }, []);

  const handleClear = () => {
    clearDebugLogs();
    setLogs([]);
  };

  return (
    <div style={{
      position: 'fixed',
      bottom: 0,
      right: 0,
      width: isExpanded ? '400px' : '150px',
      height: isExpanded ? '300px' : '40px',
      backgroundColor: '#000',
      color: '#0f0',
      zIndex: 10000,
      fontFamily: 'monospace',
      fontSize: '10px',
      overflow: 'hidden',
      border: '2px solid #0f0',
    }}>
      <div 
        style={{ 
          padding: '5px', 
          cursor: 'pointer', 
          backgroundColor: '#333' 
        }}
        onClick={() => setIsExpanded(!isExpanded)}
      >
        🐛 DEBUG LOGS ({logs.length}) {isExpanded ? '▼' : '▶'}
      </div>
      
      {isExpanded && (
        <div style={{ height: '260px', overflow: 'auto', padding: '5px' }}>
          <button 
            onClick={handleClear}
            style={{ 
              marginBottom: '5px', 
              background: '#f00', 
              color: '#fff', 
              border: 'none', 
              padding: '2px 5px' 
            }}
          >
            Clear
          </button>
          
          {logs.length === 0 ? (
            <div>No logs yet...</div>
          ) : (
            <div>
              {logs.map((log, index) => (
                <div key={index} style={{ marginBottom: '5px', borderBottom: '1px solid #333' }}>
                  <div style={{ color: '#yellow' }}>
                    {new Date(log.timestamp).toLocaleTimeString()}
                  </div>
                  <div style={{ color: '#0ff' }}>{log.url}</div>
                  <div>{log.message}</div>
                  {log.data && <div style={{ color: '#888' }}>{log.data}</div>}
                </div>
              ))}
            </div>
          )}
        </div>
      )}
    </div>
  );
};