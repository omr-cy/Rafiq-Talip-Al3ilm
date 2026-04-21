import React, { useState, useRef, useEffect } from "react";
import { useEditor, EditorContent } from "@tiptap/react";
import StarterKit from "@tiptap/starter-kit";
import Underline from "@tiptap/extension-underline";
import TextAlign from "@tiptap/extension-text-align";
import { Highlight } from "@tiptap/extension-highlight";
import { TextStyle } from "@tiptap/extension-text-style";
import { Color } from "@tiptap/extension-color";
import {
  Bold,
  Italic,
  Underline as UnderlineIcon,
  Strikethrough,
  List,
  ListOrdered,
  AlignLeft,
  AlignCenter,
  AlignRight,
  Heading1,
  Heading2,
  Type,
  Highlighter,
  Palette,
} from "lucide-react";
import { cn } from "../lib/utils";

interface RichTextEditorProps {
  content: string;
  onChange: (content: string) => void;
  placeholder?: string;
  className?: string;
}

const COLORS = [
  "#000000",
  "#ef4444",
  "#f97316",
  "#eab308",
  "#22c55e",
  "#3b82f6",
  "#8b5cf6",
  "#ec4899",
];

export function RichTextEditor({
  content,
  onChange,
  placeholder,
  className,
}: RichTextEditorProps) {
  const [showColors, setShowColors] = useState(false);
  const colorPickerRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    function handleClickOutside(event: MouseEvent) {
      if (
        colorPickerRef.current &&
        !colorPickerRef.current.contains(event.target as Node)
      ) {
        setShowColors(false);
      }
    }
    document.addEventListener("mousedown", handleClickOutside);
    return () => document.removeEventListener("mousedown", handleClickOutside);
  }, []);

  const editor = useEditor({
    extensions: [
      StarterKit,
      Underline,
      TextAlign.configure({
        types: ["heading", "paragraph"],
        defaultAlignment: "right",
      }),
      Highlight.configure({ multicolor: true }),
      TextStyle,
      Color,
    ],
    content,
    onUpdate: ({ editor }) => {
      onChange(editor.getHTML());
    },
    editorProps: {
      attributes: {
        class:
          "prose prose-sm sm:prose-base focus:outline-none max-w-none min-h-[120px] p-4 pb-4 custom-scrollbar",
        dir: "rtl",
      },
    },
  });

  if (!editor) {
    return null;
  }

  const toggleBold = () => editor.chain().focus().toggleBold().run();
  const toggleItalic = () => editor.chain().focus().toggleItalic().run();
  const toggleUnderline = () => editor.chain().focus().toggleUnderline().run();
  const toggleStrike = () => editor.chain().focus().toggleStrike().run();

  const toggleBulletList = () =>
    editor.chain().focus().toggleBulletList().run();
  const toggleOrderedList = () =>
    editor.chain().focus().toggleOrderedList().run();

  const setAlignLeft = () => editor.chain().focus().setTextAlign("left").run();
  const setAlignCenter = () =>
    editor.chain().focus().setTextAlign("center").run();
  const setAlignRight = () =>
    editor.chain().focus().setTextAlign("right").run();

  const toggleH1 = () =>
    editor.chain().focus().toggleHeading({ level: 1 }).run();
  const toggleH2 = () =>
    editor.chain().focus().toggleHeading({ level: 2 }).run();
  const setParagraph = () => editor.chain().focus().setParagraph().run();

  const toggleHighlight = () => editor.chain().focus().toggleHighlight().run();
  const setColor = (color: string) => {
    editor.chain().focus().setColor(color).run();
    setShowColors(false);
  };

  const ToolbarButton = ({
    onClick,
    isActive,
    children,
    title,
  }: {
    onClick: () => void;
    isActive?: boolean;
    children: React.ReactNode;
    title: string;
  }) => (
    <button
      onClick={onClick}
      className={cn(
        "flex-shrink-0 p-1.5 rounded-lg transition-all duration-200 ease-in-out active:scale-95",
        isActive
          ? "bg-olive-900 text-paper shadow-sm scale-105"
          : "text-olive-600 hover:bg-olive-100 hover:text-olive-900",
      )}
      title={title}
    >
      {children}
    </button>
  );

  const Divider = () => (
    <div className="w-px h-5 bg-olive-200/50 mx-0.5 flex-shrink-0" />
  );

  return (
    <div
      className={cn(
        "relative flex flex-col w-full bg-card rounded-xl border border-olive-200/50",
        className,
      )}
    >
      {/* Toolbar */}
      <div
        className={cn(
          "sticky top-0 z-[60] bg-card/95 backdrop-blur-xl border-b border-olive-200/50 shadow-sm rounded-t-xl",
          "flex items-center justify-start gap-1 p-2 overflow-x-auto hide-scrollbar transition-all duration-300 ease-out",
          editor.isFocused ? "opacity-100" : "opacity-60 hover:opacity-100"
        )}
        onMouseDown={(e) => e.preventDefault()}
      >
        {/* Text Styles */}
        <ToolbarButton
          onClick={toggleH1}
          isActive={editor.isActive("heading", { level: 1 })}
          title="عنوان رئيسي"
        >
          <Heading1 className="w-4 h-4" />
        </ToolbarButton>
        <ToolbarButton
          onClick={toggleH2}
          isActive={editor.isActive("heading", { level: 2 })}
          title="عنوان فرعي"
        >
          <Heading2 className="w-4 h-4" />
        </ToolbarButton>
        <ToolbarButton
          onClick={setParagraph}
          isActive={editor.isActive("paragraph")}
          title="نص عادي"
        >
          <Type className="w-4 h-4" />
        </ToolbarButton>

        <Divider />

        {/* Formatting */}
        <ToolbarButton
          onClick={toggleBold}
          isActive={editor.isActive("bold")}
          title="عريض"
        >
          <Bold className="w-4 h-4" />
        </ToolbarButton>
        <ToolbarButton
          onClick={toggleItalic}
          isActive={editor.isActive("italic")}
          title="مائل"
        >
          <Italic className="w-4 h-4" />
        </ToolbarButton>
        <ToolbarButton
          onClick={toggleUnderline}
          isActive={editor.isActive("underline")}
          title="تسطير"
        >
          <UnderlineIcon className="w-4 h-4" />
        </ToolbarButton>
        <ToolbarButton
          onClick={toggleStrike}
          isActive={editor.isActive("strike")}
          title="يتوسطه خط"
        >
          <Strikethrough className="w-4 h-4" />
        </ToolbarButton>

        <Divider />

        {/* Colors */}
        <ToolbarButton
          onClick={toggleHighlight}
          isActive={editor.isActive("highlight")}
          title="تمييز النص"
        >
          <Highlighter className="w-4 h-4" />
        </ToolbarButton>

        <div className="flex items-center gap-1 flex-shrink-0" ref={colorPickerRef}>
          <ToolbarButton
            onClick={() => setShowColors(!showColors)}
            isActive={showColors}
            title="لون النص"
          >
            <Palette className="w-4 h-4" />
          </ToolbarButton>

          {showColors && (
            <div className="flex items-center gap-1.5 bg-black/5 dark:bg-white/5 p-1.5 rounded-xl animate-in fade-in slide-in-from-right-2">
              {COLORS.map((color) => (
                <button
                  key={color}
                  onClick={() => setColor(color)}
                  className="w-6 h-6 rounded-full border border-olive-200 hover:scale-110 transition-transform shadow-sm flex-shrink-0 active:scale-95"
                  style={{ backgroundColor: color }}
                  title={color}
                />
              ))}
              <button
                onClick={() => {
                  editor.chain().focus().unsetColor().run();
                  setShowColors(false);
                }}
                className="text-xs font-bold text-olive-600 hover:bg-olive-100 px-2 py-1 rounded-lg transition-colors flex-shrink-0 active:scale-95"
              >
                إزالة
              </button>
            </div>
          )}
        </div>

        <Divider />

        {/* Lists */}
        <ToolbarButton
          onClick={toggleBulletList}
          isActive={editor.isActive("bulletList")}
          title="قائمة نقطية"
        >
          <List className="w-4 h-4" />
        </ToolbarButton>
        <ToolbarButton
          onClick={toggleOrderedList}
          isActive={editor.isActive("orderedList")}
          title="قائمة رقمية"
        >
          <ListOrdered className="w-4 h-4" />
        </ToolbarButton>

        <Divider />

        {/* Alignment */}
        <ToolbarButton
          onClick={setAlignRight}
          isActive={editor.isActive({ textAlign: "right" })}
          title="محاذاة لليمين"
        >
          <AlignRight className="w-4 h-4" />
        </ToolbarButton>
        <ToolbarButton
          onClick={setAlignCenter}
          isActive={editor.isActive({ textAlign: "center" })}
          title="توسيط"
        >
          <AlignCenter className="w-4 h-4" />
        </ToolbarButton>
        <ToolbarButton
          onClick={setAlignLeft}
          isActive={editor.isActive({ textAlign: "left" })}
          title="محاذاة لليسار"
        >
          <AlignLeft className="w-4 h-4" />
        </ToolbarButton>
      </div>

      <EditorContent
        editor={editor}
        className="flex-1 overflow-y-auto cursor-text"
      />
    </div>
  );
}
