import { useEffect, useState, type ChangeEvent } from 'react'
import { supabase } from '../../lib/supabase'

interface PhotoUploadProps {
  studentId: string
  photoUrl: string | null
  onUploaded: (photoUrl: string) => void
}

/**
 * Uploads a headshot to the private `student-photos` bucket at
 * /students/{student_id}/photo (F-1.2) and stores the path on the student row.
 */
export function PhotoUpload({ studentId, photoUrl, onUploaded }: PhotoUploadProps) {
  const [uploading, setUploading] = useState(false)
  const [error, setError] = useState<string | null>(null)
  const [previewUrl, setPreviewUrl] = useState<string | null>(null)

  useEffect(() => {
    if (!photoUrl) return
    let cancelled = false
    supabase.storage
      .from('student-photos')
      .createSignedUrl(photoUrl, 3600)
      .then(({ data }) => {
        if (!cancelled && data) setPreviewUrl(data.signedUrl)
      })
    return () => {
      cancelled = true
    }
  }, [photoUrl])

  async function handleFileChange(event: ChangeEvent<HTMLInputElement>) {
    const file = event.target.files?.[0]
    if (!file) return

    setUploading(true)
    setError(null)

    const path = `students/${studentId}/photo`
    const { error: uploadError } = await supabase.storage
      .from('student-photos')
      .upload(path, file, { upsert: true })

    if (uploadError) {
      setUploading(false)
      setError(uploadError.message)
      return
    }

    const { error: updateError } = await supabase
      .from('students')
      .update({ photo_url: path })
      .eq('id', studentId)
    setUploading(false)
    if (updateError) {
      setError(updateError.message)
      return
    }

    const { data: signed } = await supabase.storage
      .from('student-photos')
      .createSignedUrl(path, 3600)
    if (signed) setPreviewUrl(signed.signedUrl)
    onUploaded(path)
  }

  return (
    <div className="space-y-2">
      {previewUrl && (
        <img src={previewUrl} alt="Student" className="h-32 w-32 rounded object-cover" />
      )}
      {error && (
        <p role="alert" className="text-sm text-red-600">
          {error}
        </p>
      )}
      <input
        type="file"
        accept="image/*"
        disabled={uploading}
        onChange={(e) => void handleFileChange(e)}
      />
    </div>
  )
}
