import React, { createContext, useContext, useState } from 'react';

const BookingContext = createContext({});

export const useBooking = () => useContext(BookingContext);

export const BookingProvider = ({ children }) => {
  const [bookingData, setBookingData] = useState(() => {
    const saved = sessionStorage.getItem('operabeauty_booking_data');
    // Removed console.log
    return saved ? JSON.parse(saved) : {
      service: null, // { id, name, price, duration, image }
      professional: null, // { id, name, role, image } ou null para "Sem Preferência"
      date: null, // "YYYY-MM-DD"
      time: null, // "HH:MM"
    };
  });

  const updateBooking = (keyOrObj, value) => {
    // Removed console.log
    setBookingData((prev) => {
      let updated;
      if (typeof keyOrObj === 'object' && keyOrObj !== null) {
        updated = { ...prev, ...keyOrObj };
      } else {
        updated = { ...prev, [keyOrObj]: value };
      }
      // Removed console.log
      sessionStorage.setItem('operabeauty_booking_data', JSON.stringify(updated));
      return updated;
    });
  };

  const clearBooking = () => {
    setBookingData({
      service: null,
      professional: null,
      date: null,
      time: null,
    });
    sessionStorage.removeItem('operabeauty_booking_data');
  };

  return (
    <BookingContext.Provider value={{ bookingData, updateBooking, clearBooking }}>
      {children}
    </BookingContext.Provider>
  );
};
