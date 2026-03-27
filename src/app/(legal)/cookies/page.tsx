export default function CookiesPage() {
  return (
    <div>
      <h1 className="text-5xl mb-12 animate-slide-up">Política de Cookies</h1>
      <p className="font-light text-on-surface-variant/80 italic mb-16 text-xl">Última actualización: 25 de marzo de 2026</p>

      <section className="mb-16">
        <h2 className="text-2xl mb-8">1. ¿Qué son las cookies?</h2>
        <p>AURA GASTRONOMY (Jesús Fernández) utiliza cookies de terceros para el correcto funcionamiento de esta página web. Una cookie es un fichero que se descarga en su ordenador al acceder a determinadas páginas web. Permite a una página web, entre otras cosas, almacenar y recuperar información sobre los hábitos de navegación de un usuario o de su equipo.</p>
      </section>

      <section className="mb-16">
        <h2 className="text-2xl mb-8">2. Cookies que utilizamos</h2>
        <p>Las cookies utilizadas en esta web son las siguientes:</p>
        <ul className="list-disc pl-8 pt-4 space-y-4">
          <li><strong>Cookies Técnicas (Necesarias):</strong> Propias de Supabase para la autenticación y mantenimiento de la sesión del usuario. Estas cookies no requieren consentimiento al ser imprescindibles para el servicio solicitado.</li>
          <li><strong>Cookies de Pago (Stripe):</strong> Necesarias para tramitar suscripciones PRO/PREMIUM y prevenir fraudes.</li>
          <li><strong>Cookies de Análisis:</strong> Podemos usar cookies anónimas para medir el rendimiento de la web y mejorar el campus formativo.</li>
        </ul>
      </section>

      <section className="mb-16">
        <h2 className="text-2xl mb-8">3. ¿Cómo desactivar las cookies?</h2>
        <p>Usted puede permitir, bloquear o eliminar las cookies instaladas en su equipo mediante la configuración de las opciones del navegador instalado en su ordenador:</p>
        <ul className="list-disc pl-8 pt-4 space-y-4">
          <li><strong>Google Chrome:</strong> Herramientas &gt; Opciones &gt; Avanzadas &gt; Privacidad.</li>
          <li><strong>Firefox:</strong> Opciones &gt; Privacidad &gt; Historial &gt; Configuración Personalizada.</li>
          <li><strong>Safari:</strong> Preferencias &gt; Seguridad.</li>
          <li><strong>Microsoft Edge:</strong> Configuración &gt; Cookies y permisos del sitio.</li>
        </ul>
        <p className="pt-8 italic text-sm">La desactivación de todas las cookies puede conllevar la imposibilidad de utilizar adecuadamente el recetario y laboratorio de AURA GASTRONOMY.</p>
      </section>

      <section className="mb-16">
        <h2 className="text-2xl mb-8">4. Titulares</h2>
        <p>El titular de estas cookies es AURA GASTRONOMY (Jesús Fernández) con apoyo técnico de servicios de terceros para el procesamiento de pagos y bases de datos.</p>
      </section>
    </div>
  );
}
