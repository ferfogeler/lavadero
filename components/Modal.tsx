"use client";
import { ReactNode } from "react";

interface ModalProps {
  open: boolean;
  onClose: () => void;
  title: string;
  children: ReactNode;
  maxWidth?: string;
}

export function Modal({ open, onClose, title, children, maxWidth = "max-w-lg" }: ModalProps) {
  if (!open) return null;
  return (
    <div className="fixed inset-0 z-40 flex items-end sm:items-center justify-center bg-black/50 p-0 sm:p-4">
      <div className={`bg-white rounded-t-2xl sm:rounded-xl shadow-xl w-full ${maxWidth} max-h-[92vh] overflow-y-auto`}>
        <div className="flex items-center justify-between px-4 sm:px-6 py-4 border-b">
          <h2 className="text-lg font-semibold text-gray-900">{title}</h2>
          <button
            onClick={onClose}
            className="text-gray-400 hover:text-gray-600 text-2xl leading-none p-1"
          >
            ×
          </button>
        </div>
        <div className="px-4 sm:px-6 py-4">{children}</div>
      </div>
    </div>
  );
}
