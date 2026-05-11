/**
 * Type-safe error message extraction for catch(error: unknown) blocks.
 * Works with Axios errors, standard Error objects, and arbitrary throwables.
 */
export const getErrorMessage = (error: unknown, fallback: string): string => {
  if (typeof error === 'object' && error !== null) {
    const maybeAxios = error as { response?: { data?: { message?: string } }; message?: string }
    return maybeAxios.response?.data?.message || maybeAxios.message || fallback
  }

  return fallback
}
