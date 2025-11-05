function getBaseEmailTemplate(title, headerColor = '#ff7a00') {
  const logoUrl = 'https://homefix-frontend.vercel.app/img/logo.png';
  const primaryColor = '#ff7a00';
  const primaryDark = '#e56d00';
  const primaryDarker = '#cc6100';
  
  return {
    styles: `
      body { 
        font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, 'Helvetica Neue', Arial, sans-serif; 
        line-height: 1.6; 
        color: #1f2937; 
        margin: 0; 
        padding: 0; 
        background-color: #f9fafb;
      }
      .email-wrapper, .container { 
        max-width: 600px; 
        margin: 0 auto; 
        background-color: #ffffff;
        box-shadow: 0 4px 6px rgba(0, 0, 0, 0.1);
      }
      .header { 
        background: linear-gradient(135deg, ${primaryColor} 0%, ${primaryDarker} 100%); 
        color: white; 
        padding: 40px 30px; 
        text-align: center;
        border-radius: 8px 8px 0 0;
      }
      .logo-container {
        margin-bottom: 20px;
      }
      .logo { 
        max-width: 180px; 
        height: auto; 
        display: block; 
        margin: 0 auto;
      }
      .header h2 { 
        margin: 0; 
        font-size: 28px; 
        font-weight: 700;
        text-shadow: 0 2px 4px rgba(0, 0, 0, 0.1);
      }
      .content { 
        background-color: #ffffff; 
        padding: 40px 30px; 
        border-radius: 0 0 8px 8px;
      }
      .content p {
        margin: 0 0 16px 0;
        color: #374151;
        font-size: 16px;
      }
      .button { 
        display: inline-block; 
        background-color: ${primaryColor}; 
        color: white !important; 
        padding: 16px 32px; 
        text-decoration: none; 
        border-radius: 8px; 
        margin: 20px 0; 
        font-weight: 600;
        font-size: 16px;
        box-shadow: 0 4px 6px rgba(255, 122, 0, 0.3);
        transition: background-color 0.3s ease;
      }
      .button:hover { 
        background-color: ${primaryDark}; 
      }
      .info-box { 
        background-color: #eff6ff; 
        border-left: 4px solid #3b82f6; 
        padding: 16px; 
        margin: 20px 0; 
        border-radius: 4px;
      }
      .success-box { 
        background-color: #ecfdf5; 
        border-left: 4px solid #10b981; 
        padding: 16px; 
        margin: 20px 0; 
        border-radius: 4px;
      }
      .warning-box { 
        background-color: #fffbeb; 
        border-left: 4px solid #f59e0b; 
        padding: 16px; 
        margin: 20px 0; 
        border-radius: 4px;
      }
      .details { 
        background-color: #f9fafb; 
        padding: 24px; 
        border-radius: 8px; 
        margin: 20px 0; 
        box-shadow: 0 2px 4px rgba(0,0,0,0.05);
        border: 1px solid #e5e7eb;
      }
      .details h3 { 
        margin-top: 0; 
        color: ${primaryColor};
        font-size: 20px;
        font-weight: 600;
      }
      .details ul { 
        list-style: none; 
        padding: 0; 
        margin: 0;
      }
      .details li { 
        padding: 12px 0; 
        border-bottom: 1px solid #e5e7eb; 
        color: #4b5563;
      }
      .details li:last-child { 
        border-bottom: none; 
      }
      .footer { 
        background-color: #f9fafb;
        margin-top: 0; 
        padding: 30px; 
        border-top: 2px solid #e5e7eb; 
        font-size: 14px; 
        color: #6b7280;
        text-align: center;
        border-radius: 0 0 8px 8px;
      }
      .footer p { 
        margin: 8px 0; 
      }
      .footer strong {
        color: ${primaryColor};
      }
      .highlight { 
        background-color: #f3f4f6; 
        padding: 16px; 
        border-radius: 6px; 
        margin: 16px 0;
        border: 1px solid #e5e7eb;
        word-break: break-all;
        font-family: 'Courier New', monospace;
        font-size: 14px;
      }
      .social-links {
        margin-top: 20px;
        text-align: center;
      }
      .social-links a {
        display: inline-block;
        margin: 0 8px;
        color: #6b7280;
        text-decoration: none;
        font-size: 12px;
      }
      .social-links a:hover {
        color: ${primaryColor};
      }
    `,
    header: (titleText) => `
      <div class="header">
        <div class="logo-container">
          <img src="${logoUrl}" alt="HomeFix Logo" class="logo" />
        </div>
        <h2 style="margin: 0;">${titleText}</h2>
      </div>
    `,
    footer: () => `
      <div class="footer">
        <p><strong>Atenciosamente,</strong><br>Equipa HomeFix</p>
        <p style="font-size: 12px; color: #9ca3af; margin-top: 20px;">
          Este é um email automático. Por favor, não responda a este email.<br>
          Para suporte, entre em contacto através da nossa aplicação.
        </p>
        <div class="social-links">
          <a href="https://homefix-frontend.vercel.app" style="color: ${primaryColor}; text-decoration: none; font-weight: 600;">Visite-nos</a>
        </div>
      </div>
    `
  };
}

module.exports = { getBaseEmailTemplate };

