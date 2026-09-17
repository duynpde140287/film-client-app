import React, { Children, isValidElement, cloneElement, useId, ReactNode } from 'react';

export function Field({
  label,
  children,
  hint,
}: {
  label: string;
  children: ReactNode;
  hint?: string;
}) {
  const id = useId();
  return (
    <div className="field">
      <label htmlFor={id}>{label}</label>
      {Children.map(children, (child) =>
        isValidElement(child) &&
        ['input', 'select', 'textarea'].includes(String(child.type))
          ? cloneElement(child as React.ReactElement<any>, {
              id,
              'aria-describedby': hint ? id + '-hint' : undefined,
            })
          : child,
      )}
      {hint && <small id={id + '-hint'}>{hint}</small>}
    </div>
  );
}
