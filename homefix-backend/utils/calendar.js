
// Simulação da integração com Google Calendar
// Em ambiente real, usar googleapis + OAuth2

export async function addEventToCalendar(request, technician) {
  console.log('🗓️ Evento criado no calendário do técnico');
  console.log(`Técnico: ${technician.firstName} ${technician.lastName}`);
  console.log(`Serviço: ${request.title}`);
  console.log(`Data: ${new Date(request.scheduledAt).toLocaleString()}`);

  // Aqui você integraria com o Google Calendar real usando OAuth2
  // Ex: via googleapis.calendar.events.insert(...)
  return {
    success: true,
    message: "Evento adicionado ao calendário (simulado)"
  };
}
