// src/utils/helpers.ts
export const copyToClipboard = (text: string): Promise<void> => {
  if (!navigator.clipboard) {
    // Fallback para navegadores antiguos o contextos no seguros (http)
    const textArea = document.createElement("textarea");
    textArea.value = text;
    textArea.style.position = "fixed"; // Evita que se vea en pantalla
    document.body.appendChild(textArea);
    textArea.focus();
    textArea.select();
    try {
      document.execCommand("copy");
      return Promise.resolve();
    } catch (err) {
      return Promise.reject(new Error("No se pudo copiar"));
    } finally {
      document.body.removeChild(textArea);
    }
  }
  return navigator.clipboard.writeText(text);
};
