import React from 'react';
import { Layers, Clock } from 'lucide-react';
import Badge from './Badge';

export function PlaceholderPage({ title, description, category = 'Digital Twin Subsystem' }) {
  return (
    <div
      style={{
        backgroundColor: 'var(--bg-surface)',
        border: '1px solid var(--border-default)',
        borderRadius: 'var(--radius-md)',
        padding: '48px 32px',
        textAlign: 'center',
        display: 'flex',
        flexDirection: 'column',
        alignItems: 'center',
        justifyContent: 'center',
        gap: '16px',
        minHeight: '360px'
      }}
    >
      <div
        style={{
          width: '48px',
          height: '48px',
          borderRadius: 'var(--radius-sm)',
          backgroundColor: 'var(--accent-blue-light)',
          border: '1px solid var(--accent-blue-border)',
          display: 'flex',
          alignItems: 'center',
          justifyContent: 'center'
        }}
      >
        <Layers size={24} color="var(--accent-blue)" />
      </div>

      <div>
        <div style={{ marginBottom: '8px' }}>
          <Badge variant="teal" size="sm">
            Coming soon
          </Badge>
        </div>
        <h2 style={{ fontSize: '20px', fontWeight: 600, color: 'var(--text-primary)', marginBottom: '6px' }}>
          {title}
        </h2>
        <p style={{ fontSize: '13px', color: 'var(--text-muted)', maxWidth: '440px', margin: '0 auto' }}>
          {description || `The ${title} module is scheduled for implementation in the next phase of the digital twin integration roadmap.`}
        </p>
      </div>

      <div
        style={{
          display: 'inline-flex',
          alignItems: 'center',
          gap: '6px',
          fontSize: '11px',
          color: 'var(--text-muted)',
          backgroundColor: 'var(--bg-subtle)',
          padding: '4px 10px',
          borderRadius: 'var(--radius-xs)',
          border: '1px solid var(--border-light)'
        }}
      >
        <Clock size={13} />
        <span>Subsystem: {category} • Status: Under Construction</span>
      </div>
    </div>
  );
}

export default PlaceholderPage;

