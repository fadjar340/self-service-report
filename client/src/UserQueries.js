import React, { useState, useEffect } from 'react';
import axios from 'axios';
import { toast } from 'react-toastify';
import DatePicker from 'react-datepicker';
import 'react-datepicker/dist/react-datepicker.css';
import './styles.css';

const UserQueries = () => {
  const [queries, setQueries] = useState([]);
  const [selectedQuery, setSelectedQuery] = useState('');
  const [startDate, setStartDate] = useState(null);
  const [endDate, setEndDate] = useState(null);
  const [data, setData] = useState([]);
  const [loading, setLoading] = useState(false);

  // Fetch predefined queries
  useEffect(() => {
    const fetchQueries = async () => {
      try {
        const response = await axios.get('/query/predefined', {
          headers: { Authorization: `Bearer ${localStorage.getItem('token')}` }
        });
        if (response.data.success) {
          setQueries(response.data.data);
        } else {
          toast.error(response.data.message);
        }
      } catch (error) {
        toast.error('Failed to fetch predefined queries');
      }
    };
    fetchQueries();
  }, []);

  // Run query
  const handleSubmit = async (e) => {
    e.preventDefault();
    if (!startDate || !endDate) {
      toast.error('Start date and end date are required');
      return;
    }

    setLoading(true);
    try {
      const response = await axios.get(`/query/run/${selectedQuery}`, {
        params: {
          startDate: startDate.toISOString(),
          endDate: endDate.toISOString(),
        },
        headers: { Authorization: `Bearer ${localStorage.getItem('token')}` }
      });
      if (response.data.success) {
        setData(response.data.data);
      } else {
        toast.error(response.data.message);
      }
    } catch (error) {
      toast.error('Failed to execute query');
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="container">
      <h2>Run Predefined Queries</h2>
      <form onSubmit={handleSubmit}>
        <div className="form-group">
          <label htmlFor="query">Query:</label>
          <select
            id="query"
            value={selectedQuery}
            onChange={(e) => setSelectedQuery(e.target.value)}
            required
          >
            <option value="">Select a query</option>
            {queries.map((q) => (
              <option key={q.id} value={q.id}>
                {q.name}
              </option>
            ))}
          </select>
        </div>
        <div className="form-group">
          <label htmlFor="startDate">Start Date:</label>
          <DatePicker
            id="startDate"
            selected={startDate}
            onChange={(date) => setStartDate(date)}
            selectsStart
            startDate={startDate}
            endDate={endDate}
            showTimeSelect
            timeFormat="HH:mm"
            timeIntervals={15}
            timeCaption="Time"
            dateFormat="MMMM d, yyyy h:mm aa"
            placeholderText="Select start date and time"
            isClearable
            required
          />
        </div>
        <div className="form-group">
          <label htmlFor="endDate">End Date:</label>
          <DatePicker
            id="endDate"
            selected={endDate}
            onChange={(date) => setEndDate(date)}
            selectsEnd
            startDate={startDate}
            endDate={endDate}
            minDate={startDate}
            showTimeSelect
            timeFormat="HH:mm"
            timeIntervals={15}
            timeCaption="Time"
            dateFormat="MMMM d, yyyy h:mm aa"
            placeholderText="Select end date and time"
            isClearable
            required
          />
        </div>
        <button type="submit" disabled={loading}>
          {loading ? 'Running...' : 'Run Query'}
        </button>
      </form>
      <table>
        <thead>
          <tr>
            <th>ID</th>
            <th>Date</th>
            <th>Value</th>
          </tr>
        </thead>
        <tbody>
          {data.map((row) => (
            <tr key={row.id}>
              <td>{row.id}</td>
              <td>{new Date(row.date).toLocaleString()}</td>
              <td>{row.value}</td>
            </tr>
          ))}
        </tbody>
      </table>
    </div>
  );
};

export default UserQueries;