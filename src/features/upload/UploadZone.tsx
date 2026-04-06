import { useRef, useState } from 'react'

interface UploadZoneProps {
  onImageUpload: (url: string) => void
  uploadedImage: string | null
}

export default function UploadZone({ onImageUpload, uploadedImage }: UploadZoneProps) {
  const inputRef = useRef<HTMLInputElement>(null)
  const [isDragging, setIsDragging] = useState(false)

  const handleFile = (file: File) => {
    if (!file.type.startsWith('image/')) return
    const reader = new FileReader()
    reader.onload = (e) => {
      if (e.target?.result) {
        onImageUpload(e.target.result as string)
      }
    }
    reader.readAsDataURL(file)
  }

  const handleDrop = (e: React.DragEvent) => {
    e.preventDefault()
    setIsDragging(false)
    const file = e.dataTransfer.files[0]
    if (file) handleFile(file)
  }

  const handleChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0]
    if (file) handleFile(file)
  }

  return (
    <div
      onClick={() => inputRef.current?.click()}
      onDragOver={(e) => { e.preventDefault(); setIsDragging(true) }}
      onDragLeave={() => setIsDragging(false)}
      onDrop={handleDrop}
      className={`
        w-full rounded-[20px] border-2 border-dashed cursor-pointer
        transition-all duration-200 overflow-hidden
        flex items-center justify-center
        ${isDragging
          ? 'border-sky-400 bg-sky-100/60'
          : 'border-sky-300/70 bg-sky-50/40 hover:bg-sky-100/40 hover:border-sky-400'
        }
        ${uploadedImage ? 'h-52' : 'h-44'}
      `}
    >
      <input
        ref={inputRef}
        type="file"
        accept="image/*"
        className="hidden"
        onChange={handleChange}
      />

      {uploadedImage ? (
        <img
          src={uploadedImage}
          alt="Uploaded puzzle"
          className="w-full h-full object-cover"
        />
      ) : (
        <div className="flex flex-col items-center gap-3 text-center px-4">
          <div className="text-4xl">🖼️</div>
          <p className="font-body font-semibold text-sky-600 text-sm">
            Drop your puzzle image here
          </p>
          <p className="font-body text-sky-400 text-xs">
            or tap to browse · JPG, PNG supported
          </p>
        </div>
      )}
    </div>
  )
}