export const convertirImagenABase64 = (file: File): Promise<string> => {
    return new Promise((resolve, reject) => {
        const reader = new FileReader();
        reader.readAsDataURL(file);
        reader.onload = () => resolve(reader.result as string);
        reader.onerror = (error) => reject(error);
    });
};

// Función opcional para comprimir imágenes antes de guardar (muy recomendada para móviles)
export const comprimirImagen = (file: File, maxWidth = 400): Promise<string> => {
    return new Promise((resolve, reject) => {
        const img = new Image();
        img.src = URL.createObjectURL(file);
        img.onload = () => {
            const canvas = document.createElement('canvas');
            const scale = maxWidth / img.width;
            canvas.width = maxWidth;
            canvas.height = img.height * scale;

            const ctx = canvas.getContext('2d');
            if (ctx) {
                ctx.drawImage(img, 0, 0, canvas.width, canvas.height);
                // Comprimir a JPEG con calidad 0.7 para ahorrar espacio en IndexedDB
                resolve(canvas.toDataURL('image/jpeg', 0.7));
            } else {
                reject(new Error('No se pudo obtener el contexto del canvas'));
            }
        };
        img.onerror = reject;
    });
};