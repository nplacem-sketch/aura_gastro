export default function PrivacyPolicyPage() {
  return (
    <div>
      <h1 className="text-5xl mb-12 animate-slide-up">Política de Privacidad</h1>
      <p className="font-light text-on-surface-variant/80 italic mb-16 text-xl">Última actualización: 25 de marzo de 2026</p>

      <section className="mb-16">
        <h2 className="text-2xl mb-8">1. Identidad del Responsable del Tratamiento</h2>
        <p>AURA GASTRONOMY (titular: Jesús Fernández) garantiza la protección de los datos de carácter personal que los usuarios proporcionen en cumplimiento de lo dispuesto en el Reglamento (UE) 2016/679 (RGPD) y en la Ley Orgánica 3/2018 (LOPDGDD).</p>
        <ul className="list-none pl-0 pt-4">
          <li><strong>Email de contacto:</strong> info@auragastronomy.com</li>
          <li><strong>Finalidad:</strong> Gestión de usuarios, suscripciones y soporte técnico.</li>
        </ul>
      </section>

      <section className="mb-16">
        <h2 className="text-2xl mb-8">2. Datos Recabados</h2>
        <p>Recabamos información personal necesaria para ofrecer nuestros servicios culinarios y de investigación, tales como:</p>
        <ul className="list-disc pl-8 pt-4 space-y-2">
          <li><strong>Identificación:</strong> Nombre, apellidos y documento nacional de identidad o NIF.</li>
          <li><strong>Comunicación:</strong> Correo electrónico y dirección IP.</li>
          <li><strong>Profesional:</strong> Nivel de formación técnica para personalización del campus.</li>
          <li><strong>Financiero:</strong> Información de facturación y pagos gestionada de forma externa y segura (Stripe).</li>
        </ul>
      </section>

      <section className="mb-16">
        <h2 className="text-2xl mb-8">3. Base Legal para el Tratamiento</h2>
        <p>La base legal para el tratamiento de sus datos es el consentimiento del usuario al registrarse en la plataforma y la ejecución del contrato de prestación de servicios para los niveles PRO y PREMIUM.</p>
      </section>

      <section className="mb-16">
        <h2 className="text-2xl mb-8">4. Conservación de los Datos</h2>
        <p>Los datos se conservarán mientras se mantenga la relación comercial o durante los años necesarios para cumplir con las obligaciones legales correspondientes.</p>
      </section>

      <section className="mb-16">
        <h2 className="text-2xl mb-8">5. Destinatarios</h2>
        <p>Sus datos no se cederán a terceros ajenos a la actividad de AURA GASTRONOMY, salvo obligación legal. Trabajamos con terceros que garantizan niveles adecuados de protección (Proveedores de hosting, sistemas de base de datos Supabase, y pasarelas de pago Stripe).</p>
      </section>

      <section className="mb-16">
        <h2 className="text-2xl mb-8">6. Derechos del Usuario (Derechos ARCO)</h2>
        <p>El interesado tiene derecho a:</p>
        <ul className="list-disc pl-8 pt-4 space-y-2">
          <li>Acceder a sus datos personales.</li>
          <li>Solicitar la rectificación de los datos inexactos.</li>
          <li>Solicitar la supresión de sus datos (derecho al olvido).</li>
          <li>Oponerse al tratamiento o solicitar la limitación del mismo.</li>
        </ul>
        <p className="pt-8">Para ejercer estos derechos, puede escribir a <strong>info@auragastronomy.com</strong> adjuntando una copia de su DNI.</p>
      </section>
    </div>
  );
}
