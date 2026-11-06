"use client";

import { useState } from "react";
import type {
  ChangeEvent,
  ClipboardEvent,
  DragEvent,
  ReactNode,
  SyntheticEvent,
} from "react";
import type {
  ArrayOfObjectsInputProps,
  ImageValue,
  ObjectInputProps,
} from "sanity";
import { imageSizeValidation } from "../schema/image-rules";

function ImageUploadGuard({ children }: { children: ReactNode }) {
  const [error, setError] = useState<string>();

  function checkFiles(files: FileList | null, event: SyntheticEvent): void {
    if (!files?.length) return;
    for (const file of Array.from(files)) {
      const result = imageSizeValidation(file.size);
      if (result !== true) {
        event.preventDefault();
        event.stopPropagation();
        setError(`${file.name}: ${result}`);
        return;
      }
    }
    setError(undefined);
  }

  function handleChange(event: ChangeEvent<HTMLDivElement>): void {
    if (
      event.target instanceof HTMLInputElement &&
      event.target.type === "file"
    ) {
      checkFiles(event.target.files, event);
      // Allow the same rejected file to be selected again after an error.
      if (event.isPropagationStopped()) event.target.value = "";
    }
  }

  function handleDrop(event: DragEvent<HTMLDivElement>): void {
    checkFiles(event.dataTransfer.files, event);
  }

  function handlePaste(event: ClipboardEvent<HTMLDivElement>): void {
    checkFiles(event.clipboardData.files, event);
  }

  return (
    <div
      onChangeCapture={handleChange}
      onDropCapture={handleDrop}
      onPasteCapture={handlePaste}
    >
      {children}
      {error ? <p role="alert">{error}</p> : null}
    </div>
  );
}

export function LimitedImageInput(props: ObjectInputProps<ImageValue>) {
  return <ImageUploadGuard>{props.renderDefault(props)}</ImageUploadGuard>;
}

export function LimitedImageArrayInput(props: ArrayOfObjectsInputProps) {
  return <ImageUploadGuard>{props.renderDefault(props)}</ImageUploadGuard>;
}
