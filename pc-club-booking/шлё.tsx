import { useState } from 'react'
import './App.css'

type Zone = 'Standart' | 'Standart +' | 'Boot Camp' | 'VIP'

type Computer = {
  id: number
  zone: Zone
  x: number
  y: number
}

const computers: Computer[] = [
  // =========================
  // VIP
  //
  // 3   4   5   6
  //
  //     1   2
  // =========================

  { id: 3, zone: 'VIP', x: 9, y: 15 },
  { id: 4, zone: 'VIP', x: 19, y: 15 },
  { id: 5, zone: 'VIP', x: 29, y: 15 },
  { id: 6, zone: 'VIP', x: 39, y: 15 },

  { id: 1, zone: 'VIP', x: 14, y: 29 },
  { id: 2, zone: 'VIP', x: 24, y: 29 },


  // =========================
  // BOOT CAMP
  //
  // 7   8   9
  //
  //     10  11
  // =========================

  { id: 7, zone: 'Boot Camp', x: 67, y: 15 },
  { id: 8, zone: 'Boot Camp', x: 79, y: 15 },
  { id: 9, zone: 'Boot Camp', x: 91, y: 15 },

  { id: 10, zone: 'Boot Camp', x: 79, y: 29 },
  { id: 11, zone: 'Boot Camp', x: 91, y: 29 },




// STANDART +
{ id: 12, zone: 'Standart +', x: 76, y: 56 },
{ id: 13, zone: 'Standart +', x: 87, y: 56 },
{ id: 14, zone: 'Standart +', x: 87, y: 66 },

{ id: 15, zone: 'Standart +', x: 76, y: 66 },
{ id: 16, zone: 'Standart +', x: 46, y: 66 },

{ id: 17, zone: 'Standart +', x: 46, y: 56 },

 // STANDART

{ id: 18, zone: 'Standart', x: 77, y: 82 },
{ id: 19, zone: 'Standart', x: 90, y: 82 },
{ id: 20, zone: 'Standart', x: 90, y: 91 },
{ id: 21, zone: 'Standart', x: 77, y: 91 },

{ id: 22, zone: 'Standart', x: 66, y: 91 },
{ id: 23, zone: 'Standart', x: 56, y: 91 },
{ id: 24, zone: 'Standart', x: 46, y: 91 },
{ id: 25, zone: 'Standart', x: 46, y: 82 },
]

function App() {
  const today = new Date().toISOString().split('T')[0]

  const [selected, setSelected] = useState<number | null>(null)
  const [booked, setBooked] = useState<number[]>([])
  const [bookingOpen, setBookingOpen] = useState(false)
  const [date, setDate] = useState(today)
  const [time, setTime] = useState('18:00')
  const [duration, setDuration] = useState('2')

  const selectedComputer = computers.find(
    (computer) => computer.id === selected
  )

  const handleComputerClick = (id: number) => {
    if (booked.includes(id)) {
      return
    }

    setSelected(id)
    setBookingOpen(true)
  }

  const handleBooking = () => {
    if (selected === null || !selectedComputer) {
      return
    }

    setBooked((prev) => [...prev, selected])

    alert(
      `Бронь создана!\n\n` +
      `ПК №${selectedComputer.id}\n` +
      `Тариф: ${selectedComputer.zone}\n` +
      `Дата: ${date}\n` +
      `Время: ${time}\n` +
      `Длительность: ${duration} ч.`
    )

    setBookingOpen(false)
  }

  return (
    <main className="app">
      <header className="header">
        <h1>Бронирование ПК</h1>
        <p>Выберите компьютер</p>
      </header>

      <section className="club-map">
        {/* BOOT CAMP */}
        <div className="map-zone bootcamp-zone">
          <h2>Boot Camp</h2>
        </div>

        {/* VIP */}
        <div className="map-zone vip-zone">
          <h2>VIP</h2>
        </div>

        {/* STANDART + */}
        <div className="map-zone standart-plus-zone">
          <h2>Standart +</h2>
        </div>

        {/* STANDART */}
        <div className="map-zone standart-zone">
          <h2>Standart</h2>
        </div>

        {/* FOOD ZONE */}
        <div className="map-food">
          🍔 FOOD ZONE
        </div>

        {/* RECEPTION */}
        <div className="map-reception">
          RECEPTION
        </div>

        {/* WC */}
        <div className="map-wc">
          WC
        </div>

        {/* COMPUTERS */}
        {computers.map((computer) => (
          <button
            key={computer.id}
            className={`computer ${
              selected === computer.id ? 'selected' : ''
            } ${
              booked.includes(computer.id) ? 'booked' : ''
            }`}
            style={{
              left: `${computer.x}%`,
              top: `${computer.y}%`,
            }}
            disabled={booked.includes(computer.id)}
            onClick={() => handleComputerClick(computer.id)}
          >
            <span className="computer-number">
              {computer.id}
            </span>

            <span className="computer-zone">
              {booked.includes(computer.id)
                ? 'Забронирован'
                : selected === computer.id
                  ? 'Выбран'
                  : computer.zone}
            </span>
          </button>
        ))}
      </section>

      {/* BOOKING MODAL */}
      {bookingOpen && selectedComputer && (
        <div
          className="booking-overlay"
          onClick={() => setBookingOpen(false)}
        >
          <div
            className="booking-modal"
            onClick={(event) => event.stopPropagation()}
          >
            <button
              className="booking-close"
              onClick={() => setBookingOpen(false)}
            >
              ×
            </button>

            <h2>Бронирование</h2>

            <div className="booking-pc">
              <span>ПК №{selectedComputer.id}</span>
              <small>{selectedComputer.zone}</small>
            </div>

            <label>
              Дата
              <input
                type="date"
                min={today}
                value={date}
                onChange={(event) => setDate(event.target.value)}
              />
            </label>

            <label>
              Время начала
              <input
                type="time"
                value={time}
                onChange={(event) => setTime(event.target.value)}
              />
            </label>

            <label>
              Длительность
              <select
                value={duration}
                onChange={(event) =>
                  setDuration(event.target.value)
                }
              >
                <option value="1">1 час</option>
                <option value="2">2 часа</option>
                <option value="3">3 часа</option>
                <option value="4">4 часа</option>
                <option value="5">5 часов</option>
              </select>
            </label>

            <div className="booking-price">
              <span>Стоимость</span>
              <strong>уточняется</strong>
            </div>

            <button
              className="booking-submit"
              onClick={handleBooking}
              disabled={!date}
            >
              Забронировать
            </button>
          </div>
        </div>
      )}
    </main>
  )
}

export default App