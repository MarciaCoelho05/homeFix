export async function addEventToCalendar(request, technician) {
  console.log('🗓️ Evento criado no calendário do técnico');
  console.log(`Técnico: ${technician.firstName} ${technician.lastName}`);
  console.log(`Serviço: ${request.title}`);
  console.log(`Data: ${new Date(request.scheduledAt).toLocaleString()}`);

  return {
    success: true,
    message: "Evento adicionado ao calendário (simulado)"
  };
}
