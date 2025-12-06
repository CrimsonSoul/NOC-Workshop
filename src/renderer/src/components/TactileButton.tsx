import React from 'react';

type Props = React.ButtonHTMLAttributes<HTMLButtonElement> & {
  variant?: 'primary' | 'secondary' | 'danger';
  active?: boolean;
};

export const TactileButton: React.FC<Props> = ({
  children,
  variant = 'primary',
  active = false,
  className = '',
  style,
  ...props
}) => {
  const classes = [
    'tactile-button',
    `tactile-button--${variant}`,
    active ? 'is-active' : '',
    props.disabled ? 'is-disabled' : '',
    className
  ].filter(Boolean).join(' ');

  return (
    <button
      type={props.type ?? 'button'}
      style={style}
      className={classes}
      {...props}
    >
      <span style={{ position: 'relative', zIndex: 2, display: 'flex', alignItems: 'center', gap: '8px' }}>
        {children}
      </span>
    </button>
  );
};
