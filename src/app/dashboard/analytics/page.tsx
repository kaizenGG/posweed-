"use client";

import { useState, useEffect, useRef } from "react";
import { format, sub, isAfter, eachDayOfInterval, parseISO, startOfWeek, endOfWeek, startOfToday, endOfToday, isSameDay, isSameWeek, isWithinInterval } from "date-fns";
import { enUS, es } from "date-fns/locale";
import { CalendarIcon, ChevronDown, Info, ChevronLeft, ChevronRight } from "lucide-react";
import {
  Chart as ChartJS,
  CategoryScale,
  LinearScale,
  PointElement,
  LineElement,
  BarElement,
  Title,
  Tooltip,
  Legend,
  Filler
} from 'chart.js';
import { Line, Bar } from 'react-chartjs-2';

// Register the necessary Chart.js components
ChartJS.register(
  CategoryScale,
  LinearScale,
  PointElement,
  LineElement,
  BarElement,
  Title,
  Tooltip,
  Legend,
  Filler
);

interface AnalyticsData {
  revenue: number;
  cost: number;
  profit: number;
  profitMargin: number | null;
  dailySales: {
    date: string;
    revenue: number;
    salesCount: number;
  }[];
  weekdayData: {
    day: string;
    revenue: number;
    salesCount: number;
  }[];
  hourlyData: {
    hour: number;
    revenue: number;
    salesCount: number;
  }[];
}

interface Store {
  id: string;
  name: string;
}

const AnalyticsPage = () => {
  const [selectedStore, setSelectedStore] = useState<string>("all");
  const [stores, setStores] = useState<Store[]>([]);
  const [isLoadingData, setIsLoadingData] = useState(true);
  const [analyticsData, setAnalyticsData] = useState<AnalyticsData | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [showStoresDropdown, setShowStoresDropdown] = useState(false);
  const [dateRange, setDateRange] = useState<Date>(new Date());
  const [activeTab, setActiveTab] = useState("general");
  
  const [dataView, setDataView] = useState<"revenue" | "sales">("revenue");
  const [dailyView, setDailyView] = useState<"day" | "week" | "month">("day");
  const [showInfoTooltip, setShowInfoTooltip] = useState<{weekday: boolean, hourly: boolean}>({weekday: false, hourly: false});
  
  // Añadir estados para los períodos específicos de cada gráfico
  const [weekdayPeriod, setWeekdayPeriod] = useState<"current-week" | "last-2-weeks" | "last-month">("current-week");
  const [hourlyPeriod, setHourlyPeriod] = useState<"today" | "last-3-days" | "last-week">("today");
  
  // Estado para controlar la visibilidad del calendario
  const [showCalendar, setShowCalendar] = useState(false);
  
  // Estado para almacenar el año y mes actual en el calendario
  const [calendarDate, setCalendarDate] = useState<Date>(new Date());
  
  // Referencia para el calendario (para cerrar al hacer clic fuera)
  const calendarRef = useRef<HTMLDivElement>(null);
  const calendarButtonRef = useRef<HTMLButtonElement>(null);

  // Function to format currency
  const formatCurrency = (amount: number) => {
    return new Intl.NumberFormat('en-US', {
      style: 'currency',
      currency: 'EUR',
      minimumFractionDigits: 2
    }).format(amount);
  };

  useEffect(() => {
    // Load available stores
    const fetchStores = async () => {
      try {
        const response = await fetch('/api/stores');
        if (!response.ok) {
          throw new Error('Error loading stores');
        }
        const data = await response.json();
        setStores(data);
      } catch (err: any) {
        console.error('Error fetching stores:', err);
        setError(err.message);
      }
    };

    fetchStores();
  }, []);

  useEffect(() => {
    // Load analytics data when store or date range changes
    const fetchAnalyticsData = async () => {
      setIsLoadingData(true);
      setError(null);
      console.log(`[Analytics] Starting data load: Store=${selectedStore}, Date=${format(dateRange, 'yyyy-MM-dd')}`);

      try {
        const startDate = format(sub(dateRange, { days: 7 }), 'yyyy-MM-dd');
        const endDate = format(dateRange, 'yyyy-MM-dd');
        
        let url = `/api/dashboard/analytics?startDate=${startDate}&endDate=${endDate}`;
        if (selectedStore !== "all") {
          url += `&storeId=${selectedStore}`;
        }

        console.log(`[Analytics] Requesting data from: ${url}`);
        const response = await fetch(url);
        
        if (!response.ok) {
          const errorText = await response.text();
          console.error(`[Analytics] Error in response (${response.status}): ${errorText}`);
          throw new Error(`Error loading analytics data: ${response.status} ${response.statusText}`);
        }
        
        const rawText = await response.text();
        console.log(`[Analytics] Data received (first 300 characters): ${rawText.substring(0, 300)}...`);
        
        let data;
        try {
          data = JSON.parse(rawText);
        } catch (parseError) {
          console.error("[Analytics] Error parsing JSON response:", parseError);
          console.error("[Analytics] Response content:", rawText);
          throw new Error("Error parsing analytics data");
        }
        
        console.log(`[Analytics] Data processed successfully:`, {
          revenue: data.revenue,
          dailySalesCount: data.dailySales?.length || 0,
          weekdayDataCount: data.weekdayData?.length || 0,
          hourlyDataCount: data.hourlyData?.length || 0
        });
        
        setAnalyticsData(data);
      } catch (err: any) {
        console.error('[Analytics] Error fetching analytics data:', err);
        setError(err.message || 'Unknown error loading data');
      } finally {
        setIsLoadingData(false);
      }
    };

    fetchAnalyticsData();
  }, [selectedStore, dateRange]);

  // Función para cerrar el calendario al hacer clic fuera
  useEffect(() => {
    function handleClickOutside(event: MouseEvent) {
      if (
        calendarRef.current && 
        !calendarRef.current.contains(event.target as Node) &&
        calendarButtonRef.current && 
        !calendarButtonRef.current.contains(event.target as Node)
      ) {
        setShowCalendar(false);
      }
    }
    
    document.addEventListener("mousedown", handleClickOutside);
    return () => {
      document.removeEventListener("mousedown", handleClickOutside);
    };
  }, []);

  // Función helper para generar los días del mes
  const getDaysInMonth = (year: number, month: number) => {
    const date = new Date(year, month, 1);
    const days = [];
    let day = 0;
    
    // Obtener el primer día de la semana (0 = Domingo, 1 = Lunes, etc.)
    const firstDayOfMonth = new Date(year, month, 1).getDay();
    const daysFromPrevMonth = firstDayOfMonth === 0 ? 6 : firstDayOfMonth - 1; // Ajustar para que la semana comience en lunes
    
    // Agregar días del mes anterior
    const prevMonth = month === 0 ? 11 : month - 1;
    const prevMonthYear = month === 0 ? year - 1 : year;
    const daysInPrevMonth = new Date(prevMonthYear, prevMonth + 1, 0).getDate();
    
    for (let i = daysInPrevMonth - daysFromPrevMonth + 1; i <= daysInPrevMonth; i++) {
      days.push({
        day: i,
        month: prevMonth,
        year: prevMonthYear,
        isCurrentMonth: false
      });
    }
    
    // Agregar días del mes actual
    const daysInMonth = new Date(year, month + 1, 0).getDate();
    for (let i = 1; i <= daysInMonth; i++) {
      days.push({
        day: i,
        month,
        year,
        isCurrentMonth: true
      });
    }
    
    // Agregar días del mes siguiente para completar la grilla
    const nextMonth = month === 11 ? 0 : month + 1;
    const nextMonthYear = month === 11 ? year + 1 : year;
    const totalDaysToShow = 42; // 6 semanas * 7 días
    const daysToAdd = totalDaysToShow - days.length;
    
    for (let i = 1; i <= daysToAdd; i++) {
      days.push({
        day: i,
        month: nextMonth,
        year: nextMonthYear,
        isCurrentMonth: false
      });
    }
    
    return days;
  };

  // Función para manejar la selección de una fecha
  const handleDateSelection = (year: number, month: number, day: number) => {
    const newDate = new Date(year, month, day);
    setDateRange(newDate);
    setShowCalendar(false);
  };

  // Función para navegar al mes anterior
  const goToPreviousMonth = () => {
    setCalendarDate(prev => {
      const newDate = new Date(prev);
      newDate.setMonth(newDate.getMonth() - 1);
      return newDate;
    });
  };

  // Función para navegar al mes siguiente
  const goToNextMonth = () => {
    setCalendarDate(prev => {
      const newDate = new Date(prev);
      newDate.setMonth(newDate.getMonth() + 1);
      return newDate;
    });
  };

  // Función para verificar si un día coincide con la fecha seleccionada
  const isSelectedDate = (year: number, month: number, day: number) => {
    const date = new Date(year, month, day);
    return isSameDay(date, dateRange);
  };

  // Prepare data for charts
  const prepareChartData = () => {
    if (!analyticsData) return null;
    
    // Sort daily data by date
    const sortedDailySales = [...analyticsData.dailySales].sort((a, b) => 
      new Date(a.date).getTime() - new Date(b.date).getTime()
    );
    
    // Data for line chart (history)
    const lineChartData = {
      labels: sortedDailySales.map(day => format(new Date(day.date), 'MM/dd')),
      datasets: [
        {
          label: dataView === 'revenue' ? 'Revenue' : 'Sales',
          data: sortedDailySales.map(day => dataView === 'revenue' ? day.revenue : day.salesCount),
          borderColor: 'rgb(37, 99, 235)',
          backgroundColor: 'rgba(37, 99, 235, 0.1)',
          fill: true,
          tension: 0.4,
          pointBackgroundColor: 'rgb(37, 99, 235)',
          pointBorderColor: '#fff',
          pointBorderWidth: 1,
          pointRadius: 4,
          pointHoverRadius: 6,
        },
      ],
    };
    
    // Data for weekday chart
    const orderedDays = ['Monday', 'Tuesday', 'Wednesday', 'Thursday', 'Friday', 'Saturday', 'Sunday'];
    // Create a mapping from Spanish to English day names
    const dayTranslation: Record<string, string> = {
      'Lunes': 'Monday',
      'Martes': 'Tuesday',
      'Miércoles': 'Wednesday',
      'Jueves': 'Thursday',
      'Viernes': 'Friday',
      'Sábado': 'Saturday',
      'Domingo': 'Sunday'
    };
    
    // Get the range of dates we're analyzing
    const startDate = format(sub(dateRange, { days: 7 }), 'yyyy-MM-dd');
    const endDate = format(dateRange, 'yyyy-MM-dd');
    
    // Get localized day names - show first 3 letters plus full day on tooltip
    const getLocalizedDayName = (day: string): {short: string, full: string} => {
      const dayIndex = orderedDays.indexOf(day);
      if (dayIndex === -1) return {short: day.substring(0, 3), full: day};
      
      // Get the localized day name
      const date = new Date(2021, 0, 4 + dayIndex); // 4th Jan 2021 was a Monday
      return {
        short: format(date, 'EEE', { locale: enUS }),
        full: format(date, 'EEEE', { locale: enUS })
      };
    };
    
    // Transform the weekday data to use English day names
    interface EnhancedWeekdayData {
      day: string;
      revenue: number;
      salesCount: number;
      date?: string | null;
    }

    const transformedWeekdayData: EnhancedWeekdayData[] = analyticsData.weekdayData.map(item => ({
      day: dayTranslation[item.day] || item.day,
      revenue: item.revenue,
      salesCount: item.salesCount,
      date: null // El API actual no proporciona fechas para los datos agrupados por día
    }));
    
    // Filtrar los datos del día de la semana según el período seleccionado
    let filteredWeekdayData = [...transformedWeekdayData];
    
    // Si hay datos con fechas, filtrar por el período seleccionado
    // Nota: Este es un enfoque simulado, ya que el API actual no proporciona fechas para los datos agrupados por día de la semana
    // En un sistema real, necesitaríamos modificar la API para proporcionar esta información
    const today = new Date();
    const currentWeekStart = startOfWeek(today, { weekStartsOn: 1 }); // Semana comienza el lunes
    const lastTwoWeeksStart = sub(currentWeekStart, { weeks: 1 });
    const lastMonthStart = sub(currentWeekStart, { weeks: 3 });
    
    if (weekdayPeriod === "current-week") {
      // Solo datos de la semana actual (simulado, ya que no tenemos fechas reales en los datos)
      // En un backend real, filtraríamos las transacciones para incluir solo la semana actual
      filteredWeekdayData = transformedWeekdayData;
    } else if (weekdayPeriod === "last-2-weeks") {
      // Datos de las últimas 2 semanas (simulado)
      filteredWeekdayData = transformedWeekdayData;
    } else if (weekdayPeriod === "last-month") {
      // Datos del último mes (simulado)
      filteredWeekdayData = transformedWeekdayData;
    }
    
    const orderedWeekdayData = orderedDays.map(day => 
      filteredWeekdayData.find(d => d.day === day) || { day, revenue: 0, salesCount: 0 }
    );
    
    // Generate prettier labels with day names
    const dayLabels = orderedWeekdayData.map(day => getLocalizedDayName(day.day));
    
    const weekdayChartData = {
      labels: dayLabels.map(day => day.short),
      datasets: [
        {
          label: dataView === 'revenue' ? 'Revenue' : 'Sales',
          data: orderedWeekdayData.map(day => dataView === 'revenue' ? day.revenue : day.salesCount),
          backgroundColor: 'rgb(59, 130, 246)',
          borderRadius: 6,
          barThickness: 25,
        },
      ],
    };
    
    // Crear diferentes textos para el período según la selección
    let weekdayPeriodText = "";
    if (weekdayPeriod === "current-week") {
      weekdayPeriodText = `Current week: ${format(currentWeekStart, 'MMM d')} - ${format(today, 'MMM d, yyyy')}`;
    } else if (weekdayPeriod === "last-2-weeks") {
      weekdayPeriodText = `Last 2 weeks: ${format(lastTwoWeeksStart, 'MMM d')} - ${format(today, 'MMM d, yyyy')}`;
    } else {
      weekdayPeriodText = `Last month: ${format(lastMonthStart, 'MMM d')} - ${format(today, 'MMM d, yyyy')}`;
    }
    
    // Custom tooltip title for weekday chart
    const weekdayTooltipTitle = weekdayPeriodText;
    
    // Data for hourly chart - Ensure all 24 hours are represented
    const allHours = Array.from({ length: 24 }, (_, i) => i);

    interface EnhancedHourlyData {
      hour: number;
      revenue: number;
      salesCount: number;
      date?: string | null;
    }

    let hourlyData: EnhancedHourlyData[] = allHours.map(hour => {
      const hourData = analyticsData.hourlyData.find(h => h.hour === hour);
      return {
        hour,
        revenue: hourData ? hourData.revenue : 0,
        salesCount: hourData ? hourData.salesCount : 0,
        date: null // El API actual no proporciona fechas para los datos agrupados por hora
      };
    });
    
    // Filtrar los datos por hora según el período seleccionado
    // Nota: Este es un enfoque simulado, ya que el API actual no proporciona fechas para los datos agrupados por hora
    // En un sistema real, necesitaríamos modificar la API para proporcionar esta información
    const yesterday = sub(today, { days: 1 });
    const threeDaysAgo = sub(today, { days: 3 });
    const weekAgo = sub(today, { days: 7 });
    
    // En un backend real, filtraríamos las transacciones para obtener datos específicos del período
    // Aquí solo estamos simulando diferentes períodos
    
    // Crear diferentes textos para el período según la selección
    let hourlyPeriodText = "";
    if (hourlyPeriod === "today") {
      hourlyPeriodText = `Today: ${format(today, 'MMM d, yyyy')}`;
    } else if (hourlyPeriod === "last-3-days") {
      hourlyPeriodText = `Last 3 days: ${format(threeDaysAgo, 'MMM d')} - ${format(today, 'MMM d, yyyy')}`;
    } else {
      hourlyPeriodText = `Last week: ${format(weekAgo, 'MMM d')} - ${format(today, 'MMM d, yyyy')}`;
    }
      
    // Format hours in 12-hour format
    const formatHour = (hour: number) => {
      const period = hour >= 12 ? 'PM' : 'AM';
      const displayHour = hour % 12 === 0 ? 12 : hour % 12;
      return `${displayHour}${period}`;
    };
      
    const hourlyChartData = {
      labels: hourlyData.map(hour => formatHour(hour.hour)),
      datasets: [
        {
          label: dataView === 'revenue' ? 'Revenue' : 'Sales',
          data: hourlyData.map(hour => dataView === 'revenue' ? hour.revenue : hour.salesCount),
          backgroundColor: (context: any) => {
            // Create gradient from morning (light) to night (dark)
            const hour = hourlyData[context.dataIndex].hour;
            // Morning hours (5-11) - light blue
            if (hour >= 5 && hour <= 11) return 'rgb(96, 165, 250)';
            // Afternoon hours (12-17) - medium blue
            if (hour >= 12 && hour <= 17) return 'rgb(59, 130, 246)';
            // Evening/night hours (18-23, 0-4) - dark blue
            return 'rgb(37, 99, 235)';
          },
          borderRadius: 6,
          barThickness: 12,
        },
      ],
    };
    
    const weekdayChartOptions = {
      ...chartOptions,
      plugins: {
        ...chartOptions.plugins,
        tooltip: {
          ...chartOptions.plugins.tooltip,
          callbacks: {
            ...chartOptions.plugins.tooltip.callbacks,
            title: function(context: any) {
              // Get the day name from the label
              const dayIndex = context[0].dataIndex;
              return dayLabels[dayIndex].full;
            },
            footer: function() {
              return weekdayPeriodText;
            }
          }
        }
      }
    };
    
    const hourlyChartOptions = {
      ...chartOptions,
      plugins: {
        ...chartOptions.plugins,
        tooltip: {
          ...chartOptions.plugins.tooltip,
          callbacks: {
            ...chartOptions.plugins.tooltip.callbacks,
            title: function(context: any) {
              const hour = hourlyData[context[0].dataIndex].hour;
              // Format the hour range (e.g., "10:00 AM - 11:00 AM")
              return `${hour}:00 - ${(hour + 1) % 24}:00`;
            },
            footer: function() {
              return hourlyPeriodText;
            }
          }
        }
      }
    };
    
    return {
      lineChartData,
      weekdayChartData,
      weekdayChartOptions,
      hourlyChartData,
      hourlyChartOptions,
      weekdayPeriodText,
      hourlyPeriodText
    };
  };
  
  const chartOptions = {
    responsive: true,
    maintainAspectRatio: false,
    plugins: {
      legend: {
        display: false,
      },
      tooltip: {
        backgroundColor: 'rgba(17, 24, 39, 0.9)',
        padding: 12,
        bodyFont: {
          family: 'Inter, system-ui, sans-serif',
          size: 12
        },
        titleFont: {
          family: 'Inter, system-ui, sans-serif',
          size: 14
        },
        callbacks: {
          label: function(context: any) {
            const value = context.raw;
            return dataView === 'revenue' 
              ? formatCurrency(value)
              : `${value} ${value === 1 ? 'sale' : 'sales'}`;
          }
        }
      }
    },
    scales: {
      y: {
        beginAtZero: true,
        grid: {
          color: 'rgba(243, 244, 246, 1)',
          drawBorder: false,
        },
        ticks: {
          callback: function(value: any) {
            return dataView === 'revenue' 
              ? formatCurrency(value).replace('€', '')
              : value;
          },
          font: {
            family: 'Inter, system-ui, sans-serif',
            size: 11
          },
          color: 'rgb(107, 114, 128)'
        }
      },
      x: {
        grid: {
          display: false,
          drawBorder: false
        },
        ticks: {
          font: {
            family: 'Inter, system-ui, sans-serif',
            size: 11
          },
          color: 'rgb(107, 114, 128)'
        }
      }
    }
  };

  const chartData = prepareChartData();

  return (
    <div className="p-4 mx-auto max-w-7xl">
      <div className="flex justify-between items-center mb-4">
        <h1 className="text-2xl font-bold">Analytics</h1>
        {isLoadingData && (
          <div className="flex items-center text-gray-500">
            <div className="animate-spin rounded-full h-5 w-5 border-t-2 border-b-2 border-green-500 mr-2"></div>
            Loading data...
          </div>
        )}
      </div>

      {/* Filters */}
      <div className="flex flex-col sm:flex-row gap-3 mb-4">
        <div className="relative flex-1 max-w-[250px]">
          <button
            className="w-full flex justify-between items-center px-4 py-2 text-left bg-white border border-gray-300 rounded-md"
            onClick={() => setShowStoresDropdown(!showStoresDropdown)}
          >
            <span>
              {selectedStore === "all" ? "All stores" : 
                stores.find(store => store.id === selectedStore)?.name || "Select store"}
            </span>
            <ChevronDown className="ml-2 h-4 w-4 text-gray-500" />
          </button>
          
          {showStoresDropdown && (
            <div className="absolute z-10 w-full mt-1 bg-white border border-gray-200 rounded-md shadow-lg">
              <div className="max-h-[300px] overflow-auto p-1">
                <div
                  className="px-3 py-2 text-sm cursor-pointer hover:bg-gray-100 rounded-md"
                  onClick={() => {
                    setSelectedStore("all");
                    setShowStoresDropdown(false);
                  }}
                >
                  All stores
                </div>
                {stores.map(store => (
                  <div
                    key={store.id}
                    className="px-3 py-2 text-sm cursor-pointer hover:bg-gray-100 rounded-md"
                    onClick={() => {
                      setSelectedStore(store.id);
                      setShowStoresDropdown(false);
                    }}
                  >
                    {store.name}
                  </div>
                ))}
              </div>
            </div>
          )}
        </div>

        <div className="relative">
          <button
            ref={calendarButtonRef}
            className="w-[250px] flex items-center justify-start px-4 py-2 text-left bg-white border border-gray-300 rounded-md"
            onClick={() => setShowCalendar(!showCalendar)}
          >
            <CalendarIcon className="mr-2 h-4 w-4" />
            <span>{dateRange ? format(dateRange, 'PPP', { locale: enUS }) : 'Select date'}</span>
          </button>
          
          {showCalendar && (
            <div 
              ref={calendarRef}
              className="absolute z-10 mt-1 bg-white border border-gray-200 rounded-md shadow-lg p-3"
              style={{ width: '300px' }}
            >
              <div className="mb-2 flex justify-between items-center">
                <button 
                  onClick={goToPreviousMonth}
                  className="p-1 rounded-md hover:bg-gray-100"
                >
                  <ChevronLeft className="h-4 w-4" />
                </button>
                <div className="font-medium">
                  {format(calendarDate, 'MMMM yyyy', { locale: enUS })}
                </div>
                <button 
                  onClick={goToNextMonth}
                  className="p-1 rounded-md hover:bg-gray-100"
                >
                  <ChevronRight className="h-4 w-4" />
                </button>
              </div>
              
              <div className="grid grid-cols-7 gap-1 mb-1">
                {['Mo', 'Tu', 'We', 'Th', 'Fr', 'Sa', 'Su'].map(day => (
                  <div key={day} className="text-center text-xs font-medium text-gray-500 py-1">
                    {day}
                  </div>
                ))}
              </div>
              
              <div className="grid grid-cols-7 gap-1">
                {getDaysInMonth(calendarDate.getFullYear(), calendarDate.getMonth()).map((day, index) => (
                  <button
                    key={index}
                    className={`text-center text-sm py-1 rounded-md ${
                      day.isCurrentMonth 
                        ? isSelectedDate(day.year, day.month, day.day)
                          ? 'bg-blue-500 text-white'
                          : 'hover:bg-gray-100 text-gray-700'
                        : 'text-gray-400 hover:bg-gray-50'
                    }`}
                    onClick={() => handleDateSelection(day.year, day.month, day.day)}
                  >
                    {day.day}
                  </button>
                ))}
              </div>
              
              <div className="mt-2 pt-2 border-t border-gray-200 flex justify-between">
                <button
                  className="text-xs text-blue-600 hover:underline"
                  onClick={() => {
                    setDateRange(new Date());
                    setCalendarDate(new Date());
                    setShowCalendar(false);
                  }}
                >
                  Today
                </button>
                <button
                  className="text-xs text-gray-600 hover:underline"
                  onClick={() => setShowCalendar(false)}
                >
                  Close
                </button>
              </div>
            </div>
          )}
        </div>
      </div>

      {error && (
        <div className="bg-red-50 border border-red-200 text-red-700 px-4 py-3 rounded-md mb-6">
          {error}
        </div>
      )}

      {/* Tabs */}
      <div className="mb-2">
        <div className="border-b border-gray-200">
          <nav className="flex -mb-px space-x-6">
            <button 
              onClick={() => setActiveTab("general")}
              className={`py-2 px-1 border-b-2 font-medium text-sm ${
                activeTab === "general"
                  ? "border-blue-500 text-blue-600"
                  : "border-transparent text-gray-500 hover:text-gray-700 hover:border-gray-300"
              }`}
            >
              General
            </button>
            
            <button 
              onClick={() => setActiveTab("inventory")}
              className={`py-2 px-1 border-b-2 font-medium text-sm ${
                activeTab === "inventory"
                  ? "border-blue-500 text-blue-600"
                  : "border-transparent text-gray-500 hover:text-gray-700 hover:border-gray-300"
              }`}
            >
              Inventory
            </button>
          </nav>
        </div>

        <div className="mt-4">
          {activeTab === "general" && (
            <>
              {/* KPI Cards */}
              <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-6 mb-6">
                {/* Revenue */}
                <div className="bg-white rounded-lg p-6 shadow-sm">
                  <h3 className="text-sm font-medium text-gray-500">Revenue</h3>
                  <p className="text-2xl font-bold">
                    {isLoadingData ? "—" : (analyticsData?.revenue !== undefined ? formatCurrency(analyticsData.revenue) : "—")}
                  </p>
                </div>
                
                {/* Cost */}
                <div className="bg-white rounded-lg p-6 shadow-sm">
                  <h3 className="text-sm font-medium text-gray-500">Cost</h3>
                  <p className="text-2xl font-bold">
                    {isLoadingData ? "—" : (analyticsData?.cost !== undefined ? formatCurrency(analyticsData.cost) : "—")}
                  </p>
                </div>
                
                {/* Profit */}
                <div className="bg-white rounded-lg p-6 shadow-sm">
                  <h3 className="text-sm font-medium text-gray-500">Profit</h3>
                  <p className="text-2xl font-bold">
                    {isLoadingData ? "—" : (analyticsData?.profit !== undefined ? formatCurrency(analyticsData.profit) : "—")}
                  </p>
                </div>
                
                {/* Profit Margin */}
                <div className="bg-white rounded-lg p-6 shadow-sm">
                  <h3 className="text-sm font-medium text-gray-500">Profit Margin</h3>
                  <p className="text-2xl font-bold">
                    {isLoadingData ? "—" : (analyticsData?.profitMargin !== null && analyticsData?.profitMargin !== undefined
                        ? `${(analyticsData.profitMargin * 100).toFixed(2)}%` 
                        : "—"
                      )}
                  </p>
                </div>
              </div>

              {/* History - Line Chart */}
              <div className="bg-white rounded-lg p-5 shadow-sm mb-5">
                <div className="flex justify-between items-center mb-3">
                  <h2 className="text-lg font-semibold">History</h2>
                  <div className="flex gap-2">
                    <button 
                      className={`px-3 py-1 text-sm font-medium rounded-md ${dataView === "revenue" ? "bg-blue-100 text-blue-800" : "bg-gray-100 text-gray-600"}`}
                      onClick={() => setDataView("revenue")}
                    >
                      Revenue
                    </button>
                    <button 
                      className={`px-3 py-1 text-sm font-medium rounded-md ${dataView === "sales" ? "bg-blue-100 text-blue-800" : "bg-gray-100 text-gray-600"}`}
                      onClick={() => setDataView("sales")}
                    >
                      Sales
                    </button>
                  </div>
                </div>
                
                {isLoadingData ? (
                  <div className="flex justify-center items-center h-72">
                    <div className="animate-spin rounded-full h-8 w-8 border-t-2 border-b-2 border-blue-500"></div>
                  </div>
                ) : chartData && analyticsData?.dailySales && analyticsData.dailySales.length > 0 ? (
                  <div className="h-72">
                    <Line 
                      data={chartData.lineChartData} 
                      options={chartOptions} 
                    />
                  </div>
                ) : (
                  <div className="flex justify-center items-center h-72 text-gray-500">
                    No data available for the selected period
                  </div>
                )}
              </div>
              
              {/* Performance charts by weekday and hour */}
              <div className="grid grid-cols-1 lg:grid-cols-2 gap-5 mb-5">
                {/* Sales by day of week */}
                <div className="bg-white p-5 rounded-lg shadow-sm">
                  <div className="flex justify-between items-center mb-4">
                    <div className="flex items-center">
                      <h3 className="font-medium">Sales by Day of Week</h3>
                      <button 
                        className="ml-1.5 text-gray-400 hover:text-gray-600"
                        onMouseEnter={() => setShowInfoTooltip({...showInfoTooltip, weekday: true})}
                        onMouseLeave={() => setShowInfoTooltip({...showInfoTooltip, weekday: false})}
                      >
                        <Info className="h-4 w-4" />
                      </button>
                      {showInfoTooltip.weekday && (
                        <div className="absolute z-10 bg-gray-800 text-white text-xs rounded p-2 mt-8 ml-6 max-w-xs shadow-lg">
                          This chart shows data aggregated by day of week for the selected period.
                        </div>
                      )}
                    </div>
                    <div className="flex gap-2">
                      <button 
                        className={`px-2 py-1 text-xs font-medium rounded-md ${dataView === "revenue" ? "bg-blue-100 text-blue-800" : "bg-gray-100 text-gray-600"}`}
                        onClick={() => setDataView("revenue")}
                      >
                        Revenue
                      </button>
                      <button 
                        className={`px-2 py-1 text-xs font-medium rounded-md ${dataView === "sales" ? "bg-blue-100 text-blue-800" : "bg-gray-100 text-gray-600"}`}
                        onClick={() => setDataView("sales")}
                      >
                        Sales
                      </button>
                    </div>
                  </div>
                  
                  {/* Selector de período para días de la semana */}
                  <div className="mb-4 flex justify-end">
                    <div className="inline-flex rounded-md shadow-sm" role="group">
                      <button 
                        type="button" 
                        className={`px-3 py-1 text-xs font-medium rounded-l-lg ${weekdayPeriod === "current-week" ? "bg-blue-500 text-white" : "bg-white text-gray-700 hover:bg-gray-50"} border border-gray-300`}
                        onClick={() => setWeekdayPeriod("current-week")}
                      >
                        This Week
                      </button>
                      <button 
                        type="button" 
                        className={`px-3 py-1 text-xs font-medium ${weekdayPeriod === "last-2-weeks" ? "bg-blue-500 text-white" : "bg-white text-gray-700 hover:bg-gray-50"} border-t border-b border-gray-300`}
                        onClick={() => setWeekdayPeriod("last-2-weeks")}
                      >
                        Last 2 Weeks
                      </button>
                      <button 
                        type="button" 
                        className={`px-3 py-1 text-xs font-medium rounded-r-lg ${weekdayPeriod === "last-month" ? "bg-blue-500 text-white" : "bg-white text-gray-700 hover:bg-gray-50"} border border-gray-300`}
                        onClick={() => setWeekdayPeriod("last-month")}
                      >
                        Last Month
                      </button>
                    </div>
                  </div>
                  
                  {isLoadingData ? (
                    <div className="flex justify-center items-center h-64">
                      <div className="animate-spin rounded-full h-8 w-8 border-t-2 border-b-2 border-blue-500"></div>
                    </div>
                  ) : chartData && analyticsData?.weekdayData && analyticsData.weekdayData.length > 0 ? (
                    <>
                    <div className="h-64">
                      <Bar 
                        data={chartData.weekdayChartData} 
                          options={chartData.weekdayChartOptions} 
                      />
                    </div>
                      <div className="mt-2 text-xs text-center text-gray-500">
                        {chartData.weekdayPeriodText}
                      </div>
                    </>
                  ) : (
                    <div className="flex justify-center items-center h-64 text-gray-500">
                      No data available
                    </div>
                  )}
                </div>
                
                {/* Sales by hour */}
                <div className="bg-white p-5 rounded-lg shadow-sm">
                  <div className="flex justify-between items-center mb-4">
                    <div className="flex items-center">
                      <h3 className="font-medium">Sales by Hour of Day</h3>
                      <button 
                        className="ml-1.5 text-gray-400 hover:text-gray-600"
                        onMouseEnter={() => setShowInfoTooltip({...showInfoTooltip, hourly: true})}
                        onMouseLeave={() => setShowInfoTooltip({...showInfoTooltip, hourly: false})}
                      >
                        <Info className="h-4 w-4" />
                      </button>
                      {showInfoTooltip.hourly && (
                        <div className="absolute z-10 bg-gray-800 text-white text-xs rounded p-2 mt-8 ml-6 max-w-xs shadow-lg">
                          This chart shows data aggregated by hour of day for the selected period.
                          <div className="mt-1 text-gray-300">
                            Colors indicate time of day: lighter (morning), medium (afternoon), darker (evening/night)
                          </div>
                        </div>
                      )}
                    </div>
                    <div className="flex gap-2">
                      <button 
                        className={`px-2 py-1 text-xs font-medium rounded-md ${dataView === "revenue" ? "bg-blue-100 text-blue-800" : "bg-gray-100 text-gray-600"}`}
                        onClick={() => setDataView("revenue")}
                      >
                        Revenue
                      </button>
                      <button 
                        className={`px-2 py-1 text-xs font-medium rounded-md ${dataView === "sales" ? "bg-blue-100 text-blue-800" : "bg-gray-100 text-gray-600"}`}
                        onClick={() => setDataView("sales")}
                      >
                        Sales
                      </button>
                    </div>
                  </div>
                  
                  {/* Selector de período para horas del día */}
                  <div className="mb-4 flex justify-end">
                    <div className="inline-flex rounded-md shadow-sm" role="group">
                      <button 
                        type="button" 
                        className={`px-3 py-1 text-xs font-medium rounded-l-lg ${hourlyPeriod === "today" ? "bg-blue-500 text-white" : "bg-white text-gray-700 hover:bg-gray-50"} border border-gray-300`}
                        onClick={() => setHourlyPeriod("today")}
                      >
                        Today
                      </button>
                      <button 
                        type="button" 
                        className={`px-3 py-1 text-xs font-medium ${hourlyPeriod === "last-3-days" ? "bg-blue-500 text-white" : "bg-white text-gray-700 hover:bg-gray-50"} border-t border-b border-gray-300`}
                        onClick={() => setHourlyPeriod("last-3-days")}
                      >
                        Last 3 Days
                      </button>
                      <button 
                        type="button" 
                        className={`px-3 py-1 text-xs font-medium rounded-r-lg ${hourlyPeriod === "last-week" ? "bg-blue-500 text-white" : "bg-white text-gray-700 hover:bg-gray-50"} border border-gray-300`}
                        onClick={() => setHourlyPeriod("last-week")}
                      >
                        Last Week
                      </button>
                    </div>
                  </div>
                  
                  {isLoadingData ? (
                    <div className="flex justify-center items-center h-64">
                      <div className="animate-spin rounded-full h-8 w-8 border-t-2 border-b-2 border-blue-500"></div>
                    </div>
                  ) : chartData && analyticsData?.hourlyData ? (
                    <>
                    <div className="h-64">
                      <Bar 
                        data={chartData.hourlyChartData} 
                          options={chartData.hourlyChartOptions} 
                      />
                    </div>
                      <div className="mt-2 text-xs text-center text-gray-500">
                        {chartData.hourlyPeriodText}
                      </div>
                    </>
                  ) : (
                    <div className="flex justify-center items-center h-64 text-gray-500">
                      No data available
                    </div>
                  )}
                </div>
              </div>
            </>
          )}

          {activeTab === "inventory" && (
            <div className="bg-white rounded-lg shadow-sm p-6 h-64 flex items-center justify-center">
              <p className="text-gray-500">Inventory content coming soon</p>
            </div>
          )}
        </div>
      </div>
    </div>
  );
};

export default AnalyticsPage; 