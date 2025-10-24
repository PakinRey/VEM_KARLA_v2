import React from 'react';
export default function Input(props: React.InputHTMLAttributes<HTMLInputElement> & {label:string}) {
  const {label, id, ...rest} = props;
  return (
    <label className="text-sm">
      {label}
      <input id={id} {...rest} className={`mt-1 block w-full border rounded-md px-2 py-1`} />
    </label>
  );
}
