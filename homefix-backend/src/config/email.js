const transporter = {
  sendMail: async (mailOptions) => {
    throw new Error('Configuração de email não implementada');
  },
  verify: (callback) => {
    callback(new Error('Configuração de email não implementada'));
  }
};

module.exports = transporter;
