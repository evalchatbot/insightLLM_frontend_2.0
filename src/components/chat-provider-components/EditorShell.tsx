"use client";
import React, { useRef } from "react";
import CodeBlock from "@/components/chat-provider-components/code-block";
import {
  BubbleMenu,
  EditorContent,
  ReactNodeViewRenderer,
  useEditor,
} from "@tiptap/react";
import StarterKit from "@tiptap/starter-kit";
import { CodeBlockLowlight } from "@tiptap/extension-code-block-lowlight";
import { lowlight } from "lowlight";
import { Markdown as TipTapMkd } from "tiptap-markdown";
import { FormatOutput } from "@/utils/shadow";
import root from "react-shadow/styled-components";
import { FaWandMagicSparkles } from "react-icons/fa6";

const extensions = [
  StarterKit.configure({
    // Disable the default codeBlock since we're using CodeBlockLowlight
    codeBlock: false,
  }),
  TipTapMkd,
  CodeBlockLowlight.extend({
    addNodeView: () => ReactNodeViewRenderer(CodeBlock),
  }).configure({ lowlight }),
];

interface EditorShellProps {
  initialResponse: string;
  selectedNode: string;
  dropdown: boolean;
  onSelectNode: () => void;
  onButtonClick: () => void;
  onEditorReady?: (editor: any) => void;
}

const EditorShell: React.FC<EditorShellProps> = ({
  initialResponse,
  selectedNode,
  dropdown,
  onSelectNode,
  onButtonClick,
  onEditorReady,
}) => {
  const buttonRef = useRef<HTMLButtonElement>(null);

  const editor = useEditor({
    extensions,
    content: initialResponse,
    onUpdate: ({ editor }) => {
      editor.commands.setContent(initialResponse);
    },
    onCreate: ({ editor }) => {
      onEditorReady?.(editor);
    },
  });

  return (
    <root.div className="w-full shadowDiv -translate-y-4">
      <FormatOutput>
        {editor && (
          <BubbleMenu editor={editor}>
            {!dropdown && (
              <button
                ref={buttonRef}
                onClick={onButtonClick}
                style={{
                  fontSize: "1rem",
                  color: "white",
                  padding: "10px",
                  borderRadius: "50%",
                  border: "none",
                  aspectRatio: "1/1",
                  cursor: "pointer",
                  height: "2.5rem",
                  backgroundColor: "#334155"
                }}
              >
                <FaWandMagicSparkles />
              </button>
            )}
          </BubbleMenu>
        )}
        <EditorContent spellCheck={false} editor={editor} />
      </FormatOutput>
    </root.div>
  );
};

export default EditorShell;