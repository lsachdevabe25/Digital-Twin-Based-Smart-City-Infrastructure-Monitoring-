import React from 'react';

/**
 * Reusable minimal status badge for enterprise UI
 * Variants: 'info' | 'teal' | 'success' | 'warning' | 'neutral'
 */
export function Badge({ children, variant = 'neutral', size = 'sm' }) {
  const getStyles = () => {
    switch (variant) {
      case 'teal':
        return {
          backgroundColor: 'var(--accent-teal-light)',
          color: 'var(--accent-teal-dark)',
          borderColor: 'var(--accent-teal-border)'
        };
      case 'info':
      case 'blue':
        return {
          backgroundColor: 'var(--accent-blue-light)',
          color: 'var(--accent-blue-dark)',
          borderColor: 'var(--accent-blue-border)'
        };
      case 'success':
        return {
          backgroundColor: 'var(--status-success-bg)',
          color: 'var(--status-success-text)',
          borderColor: 'var(--status-success-border)'
        };
      case 'warning':
        return {
          backgroundColor: 'var(--status-warning-bg)',
          color: 'var(--status-warning-text)',
          borderColor: 'var(--status-warning-border)'
        };
      case 'error':
      case 'danger':
        return {
          backgroundColor: 'var(--status-error-bg)',
          color: 'var(--status-error-text)',
          borderColor: 'var(--status-error-border)'
        };
      case 'neutral':
      default:
        return {
          backgroundColor: 'var(--bg-subtle)',
          color: 'var(--text-secondary)',
          borderColor: 'var(--border-default)'
        };
    }
  };

  const currentStyle = getStyles();

  return (
    <span
      style={{
        display: 'inline-flex',
        alignItems: 'center',
        gap: '4px',
        padding: size === 'sm' ? '2px 8px' : '4px 10px',
        fontSize: size === 'sm' ? '11px' : '12px',
        fontWeight: 500,
        borderRadius: 'var(--radius-xs)',
        border: '1px solid',
        lineHeight: 1.2,
        letterSpacing: '0.01em',
        whiteSpace: 'nowrap',
        ...currentStyle
      }}
    >
      {children}
    </span>
  );
}

export default Badge;

