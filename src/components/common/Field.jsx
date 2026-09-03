import React, { useState } from 'react';

export default function Field({
  icon: Icon,
  placeholder = '',
  type = 'text',
  value,
  onChange,
  end: End,
  onEnd,
  required,
  autoComplete,
  name,
  maxLength,
  style,
  readOnly: explicitReadOnly
}) {
  const [isFocused, setIsFocused] = useState(false);
  const isRequired = required !== undefined
    ? required
    : !placeholder.toLowerCase().includes('optional');

  const defaultAutoComplete = type === 'password' ? 'new-password' : 'off';

  return (
    <div className="field" style={style}>
      {Icon && <Icon size={21} />}
      <input
        required={isRequired}
        type={type}
        name={name || 'manual_entry_' + (placeholder ? placeholder.replace(/[^a-zA-Z0-9]/g, '_').toLowerCase() : 'field')}
        autoComplete={autoComplete || defaultAutoComplete}
        autoCorrect="off"
        autoCapitalize="off"
        spellCheck="false"
        data-lpignore="true"
        data-form-type="other"
        maxLength={maxLength}
        placeholder={placeholder}
        value={value ?? ''}
        readOnly={explicitReadOnly !== undefined ? explicitReadOnly : !isFocused}
        onFocus={(e) => {
          setIsFocused(true);
          e.target.removeAttribute('readonly');
        }}
        onMouseEnter={() => setIsFocused(true)}
        onChange={(e) => onChange && onChange(e.target.value)}
      />
      {End && (
        <button type="button" onClick={onEnd}>
          {React.isValidElement(End) ? End : <End size={21} />}
        </button>
      )}
    </div>
  );
}
