"use client"

import { NodeViewContent, NodeViewWrapper, type ReactNodeViewProps } from '@tiptap/react';
import React, { useRef, useState } from 'react';
import { IoCheckmarkDoneSharp } from 'react-icons/io5';
import { MdContentCopy } from 'react-icons/md';

// Use the tiptap-provided ReactNodeViewProps so the component matches
// the shape expected by ReactNodeViewRenderer
const CodeBlock = ({ node, updateAttributes, extension }: ReactNodeViewProps<HTMLElement>) => {
  // node.attrs may or may not have a language property depending on schema.
  // Access it safely and provide a default.
  const defaultLanguage = (node.attrs as any)?.language ?? '';
  const codeRef = useRef<HTMLPreElement>(null);
  const [isCopying, setIsCopying] = useState(false);

  const handleCopy = () => {
    if (codeRef.current) {
      const codeElement = codeRef.current.querySelector('code');
      if (codeElement) {
        setIsCopying(true);
        navigator.clipboard.writeText(codeElement.textContent || '')
          .then(() => {
            setTimeout(() => {
              setIsCopying(false);
            }, 1000);
          })
          .catch(err => {
            console.error('Failed to copy code: ', err);
            setIsCopying(false);
          });
      }
    }
  };

  // Safely capitalize the first letter of the language
  const capitalizedLanguage = defaultLanguage
    ? defaultLanguage.charAt(0).toUpperCase() + defaultLanguage.slice(1)
    : 'Code';

  return (
    <NodeViewWrapper className="code-block">
      <pre ref={codeRef}>
        <div className='codeHeader'>
          <p className="code-title">{capitalizedLanguage}</p>
          <button
            type="button"
            onClick={handleCopy}
          >
            {isCopying ? (
              <IoCheckmarkDoneSharp/>
            ) : (
              <MdContentCopy />
            )}
          </button>
        </div>
        <NodeViewContent as="code" />
      </pre>
    </NodeViewWrapper>
  );
};

export default CodeBlock;
