function getBaseEmailTemplate(title, headerColor = '#ff7a00') {
  return {
    styles: `
      body { font-family: Arial, sans-serif; line-height: 1.6; color: #333; margin: 0; padding: 0; }
      .container { max-width: 600px; margin: 0 auto; padding: 20px; }
      .header { background-color: ${headerColor}; color: white; padding: 30px 20px; border-radius: 8px 8px 0 0; }
      .header h2 { margin: 0; font-size: 24px; }
      .content { background-color: #f9f9f9; padding: 30px 20px; border-radius: 0 0 8px 8px; }
      .button { display: inline-block; background-color: #ff7a00; color: white !important; padding: 14px 28px; text-decoration: none; border-radius: 6px; margin: 16px 0; font-weight: bold; }
      .button:hover { background-color: #e66d00; }
      .info-box { background-color: #e7f3ff; border-left: 4px solid #2196F3; padding: 16px; margin: 16px 0; border-radius: 4px; }
      .success-box { background-color: #d4edda; border-left: 4px solid: #28a745; padding: 16px; margin: 16px 0; border-radius: 4px; }
      .warning-box { background-color: #fff3cd; border-left: 4px solid #ffc107; padding: 16px; margin: 16px 0; border-radius: 4px; }
      .details { background-color: white; padding: 20px; border-radius: 6px; margin: 16px 0; box-shadow: 0 2px 4px rgba(0,0,0,0.1); }
      .details h3 { margin-top: 0; color: ${headerColor}; }
      .details ul { list-style: none; padding: 0; }
      .details li { padding: 8px 0; border-bottom: 1px solid #eee; }
      .details li:last-child { border-bottom: none; }
      .footer { margin-top: 30px; padding-top: 20px; border-top: 2px solid #ddd; font-size: 12px; color: #666; }
      .footer p { margin: 8px 0; }
      .highlight { background-color: #f5f5f5; padding: 12px; border-radius: 4px; margin: 12px 0; }
    `,
    header: (titleText) => `
      <div class="header">
        <h2 style="margin: 0;">${titleText}</h2>
      </div>
    `,
    footer: () => `
      <div class="footer">
        <p><strong>Atenciosamente,</strong><br>Equipa HomeFix</p>
        <p style="font-size: 11px; color: #999;">Este é um email automático. Por favor, não responda a este email.</p>
      </div>
    `
  };
}

module.exports = { getBaseEmailTemplate };

