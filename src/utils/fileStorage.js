import { supabase } from '../supabase'

export const uploadFile = async (file, userId) => {
  try {
    // Create a unique file path: userId/timestamp-filename
    const fileExt = file.name.split('.').pop()
    const fileName = `${userId}/${Date.now()}-${Math.random().toString(36).substring(7)}.${fileExt}`
    const filePath = `${fileName}`

    // Upload the file to Supabase storage
    const { error: uploadError } = await supabase.storage
      .from('invoice-files')
      .upload(filePath, file)

    if (uploadError) throw uploadError

    // Get the public URL
    const { data: { publicUrl } } = supabase.storage
      .from('invoice-files')
      .getPublicUrl(filePath)

    return {
      path: filePath,
      url: publicUrl
    }
  } catch (error) {
    console.error('Error uploading file:', error)
    throw error
  }
}

export const deleteFile = async (filePath) => {
  try {
    const { error } = await supabase.storage
      .from('invoice-files')
      .remove([filePath])

    if (error) throw error
  } catch (error) {
    console.error('Error deleting file:', error)
    throw error
  }
}

export const getFileUrl = (filePath) => {
  const { data: { publicUrl } } = supabase.storage
    .from('invoice-files')
    .getPublicUrl(filePath)
  return publicUrl
} 