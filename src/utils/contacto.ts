// ============================================================
// Configuración de contacto para que el cliente te escriba
// ============================================================

// ⚠️ CAMBIA ESTOS VALORES ANTES DE COMPILAR PARA PRODUCCIÓN

/** Tu número de WhatsApp (código de país sin "+", ej: 5355512345) */
export const WHATSAPP_NUMERO = '+5355501545';

/** Tu nombre o el de tu negocio */
export const NOMBRE_VENDEDOR = 'Alex';

/** Mensaje que se prellena en WhatsApp al tocar el botón */
export const MENSAJE_PRECARGADO = (diasPrueba: number) =>
    `Hola ${NOMBRE_VENDEDOR}! 👋 Estuve probando CuentaClara durante ${diasPrueba} días y me gustó. Quiero comprar mi licencia para activarla. ¿Me pasas el código?`;

/** URL de WhatsApp (requiere internet) */
export const urlWhatsApp = (mensaje?: string) => {
    const texto = mensaje || 'Hola! Quiero comprar una licencia de CuentaClara';
    return `https://wa.me/${WHATSAPP_NUMERO}?text=${encodeURIComponent(texto)}`;
};

/** Muestra el número formateado con "+" adelante */
export const telefonoFormateado = () => {
    const n = WHATSAPP_NUMERO.replace(/\D/g, '');
    return `+${n}`;
};