import React, { useMemo, useState } from 'react';

const TechnicianCalendar = ({ requests, onDateSelect, onRequestClick }) => {
  const [currentMonth, setCurrentMonth] = useState(new Date().getMonth());
  const [currentYear, setCurrentYear] = useState(new Date().getFullYear());

  // Agrupar pedidos por dia
  const requestsByDate = useMemo(() => {
    const grouped = {};
    requests.forEach((request) => {
      if (request.scheduledAt) {
        try {
          const date = new Date(request.scheduledAt);
          if (!isNaN(date.getTime())) {
            const dateKey = `${date.getFullYear()}-${date.getMonth()}-${date.getDate()}`;
            if (!grouped[dateKey]) {
              grouped[dateKey] = [];
            }
            grouped[dateKey].push(request);
          }
        } catch (e) {
          console.warn('Data inválida no pedido:', request.id, request.scheduledAt);
        }
      }
    });
    return grouped;
  }, [requests]);

  // Obter dias do mês
  const getDaysInMonth = (month, year) => {
    const firstDay = new Date(year, month, 1);
    const lastDay = new Date(year, month + 1, 0);
    const daysInMonth = lastDay.getDate();
    const startingDayOfWeek = firstDay.getDay();

    const days = [];
    
    // Dias do mês anterior (para preencher o início)
    const prevMonth = month === 0 ? 11 : month - 1;
    const prevYear = month === 0 ? year - 1 : year;
    const daysInPrevMonth = new Date(prevYear, prevMonth + 1, 0).getDate();
    
    for (let i = startingDayOfWeek - 1; i >= 0; i--) {
      days.push({
        day: daysInPrevMonth - i,
        month: prevMonth,
        year: prevYear,
        isCurrentMonth: false,
      });
    }

    // Dias do mês atual
    for (let day = 1; day <= daysInMonth; day++) {
      const dateKey = `${year}-${month}-${day}`;
      days.push({
        day,
        month,
        year,
        isCurrentMonth: true,
        hasRequests: !!requestsByDate[dateKey],
        requests: requestsByDate[dateKey] || [],
      });
    }

    // Dias do próximo mês (para preencher o final)
    const daysToAdd = 42 - days.length; // 6 semanas * 7 dias
    for (let day = 1; day <= daysToAdd; day++) {
      days.push({
        day,
        month: month === 11 ? 0 : month + 1,
        year: month === 11 ? year + 1 : year,
        isCurrentMonth: false,
      });
    }

    return days;
  };

  const days = getDaysInMonth(currentMonth, currentYear);
  const monthNames = [
    'Janeiro', 'Fevereiro', 'Março', 'Abril', 'Maio', 'Junho',
    'Julho', 'Agosto', 'Setembro', 'Outubro', 'Novembro', 'Dezembro',
  ];
  const weekDays = ['Dom', 'Seg', 'Ter', 'Qua', 'Qui', 'Sex', 'Sáb'];

  const handlePrevMonth = () => {
    if (currentMonth === 0) {
      setCurrentMonth(11);
      setCurrentYear(currentYear - 1);
    } else {
      setCurrentMonth(currentMonth - 1);
    }
  };

  const handleNextMonth = () => {
    if (currentMonth === 11) {
      setCurrentMonth(0);
      setCurrentYear(currentYear + 1);
    } else {
      setCurrentMonth(currentMonth + 1);
    }
  };

  const handleDayClick = (dayInfo) => {
    if (dayInfo.isCurrentMonth && dayInfo.hasRequests && onDateSelect) {
      onDateSelect(dayInfo);
    }
  };

  const handleRequestClick = (e, request) => {
    e.stopPropagation();
    if (onRequestClick) {
      onRequestClick(request);
    }
  };

  const today = new Date();
  const isToday = (dayInfo) => {
    return (
      dayInfo.isCurrentMonth &&
      dayInfo.day === today.getDate() &&
      dayInfo.month === today.getMonth() &&
      dayInfo.year === today.getFullYear()
    );
  };

  return (
    <div className="card border-0 shadow-sm">
      <div
        style={{
          backgroundColor: '#ff7a00',
          color: 'white',
          padding: '16px 20px',
          borderRadius: '16px 16px 0 0',
        }}
      >
        <div className="d-flex justify-content-between align-items-center">
          <button
            type="button"
            className="btn btn-link text-white p-0"
            onClick={handlePrevMonth}
            style={{ textDecoration: 'none', fontSize: '18px' }}
          >
            ‹
          </button>
          <h5 className="mb-0 fw-semibold">
            {monthNames[currentMonth]} {currentYear}
          </h5>
          <button
            type="button"
            className="btn btn-link text-white p-0"
            onClick={handleNextMonth}
            style={{ textDecoration: 'none', fontSize: '18px' }}
          >
            ›
          </button>
        </div>
      </div>

      <div className="p-3">
        <div className="d-grid" style={{ gridTemplateColumns: 'repeat(7, 1fr)', gap: '4px' }}>
          {weekDays.map((day) => (
            <div
              key={day}
              className="text-center fw-semibold small"
              style={{ padding: '8px', color: '#6b7280' }}
            >
              {day}
            </div>
          ))}

          {days.map((dayInfo, index) => {
            const dateKey = `${dayInfo.year}-${dayInfo.month}-${dayInfo.day}`;
            const hasRequests = dayInfo.hasRequests || false;
            const dayIsToday = isToday(dayInfo);

            return (
              <div
                key={index}
                onClick={() => handleDayClick(dayInfo)}
                style={{
                  aspectRatio: '1',
                  padding: '4px',
                  cursor: dayInfo.isCurrentMonth && hasRequests ? 'pointer' : 'default',
                  position: 'relative',
                  borderRadius: '8px',
                  backgroundColor: dayIsToday
                    ? '#ff7a00'
                    : dayInfo.isCurrentMonth
                      ? hasRequests
                        ? '#ffe4cc'
                        : '#ffffff'
                      : '#f9fafb',
                  color: dayIsToday
                    ? 'white'
                    : dayInfo.isCurrentMonth
                      ? '#1f2937'
                      : '#d1d5db',
                  border: dayIsToday 
                    ? '2px solid #ff7a00' 
                    : hasRequests && dayInfo.isCurrentMonth
                      ? '1px solid #ff7a00'
                      : '1px solid #e5e7eb',
                  transition: 'all 0.2s',
                }}
                onMouseEnter={(e) => {
                  if (dayInfo.isCurrentMonth && hasRequests) {
                    e.currentTarget.style.backgroundColor = dayIsToday ? '#ff7a00' : '#ffd4a3';
                    e.currentTarget.style.transform = 'scale(1.05)';
                    e.currentTarget.style.borderColor = '#ff7a00';
                  }
                }}
                onMouseLeave={(e) => {
                  if (dayInfo.isCurrentMonth && hasRequests) {
                    e.currentTarget.style.backgroundColor = dayIsToday ? '#ff7a00' : '#ffe4cc';
                    e.currentTarget.style.transform = 'scale(1)';
                    e.currentTarget.style.borderColor = '#ff7a00';
                  }
                }}
              >
                <div className="d-flex flex-column align-items-center justify-content-center h-100">
                  <span className="small fw-semibold">{dayInfo.day}</span>
                  {hasRequests && (
                    <div className="mt-1">
                      <span
                        className="badge rounded-pill"
                        style={{
                          backgroundColor: '#ff7a00',
                          color: 'white',
                          fontSize: '10px',
                          padding: '2px 6px',
                        }}
                      >
                        {dayInfo.requests.length}
                      </span>
                    </div>
                  )}
                </div>
              </div>
            );
          })}
        </div>

        <div className="mt-3 d-flex gap-3 align-items-center">
          <div className="d-flex align-items-center gap-2">
            <div
              style={{
                width: '16px',
                height: '16px',
                backgroundColor: '#ff7a00',
                borderRadius: '4px',
                border: '1px solid #ff7a00',
              }}
            ></div>
            <span className="small">Hoje</span>
          </div>
          <div className="d-flex align-items-center gap-2">
            <div
              style={{
                width: '16px',
                height: '16px',
                backgroundColor: '#ffe4cc',
                borderRadius: '4px',
                border: '1px solid #ff7a00',
              }}
            ></div>
            <span className="small">Com pedidos</span>
          </div>
        </div>
      </div>
    </div>
  );
};

export default TechnicianCalendar;

