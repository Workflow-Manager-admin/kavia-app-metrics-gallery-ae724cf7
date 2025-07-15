import React, { useState, useEffect, useMemo } from 'react';
import './App.css';

// Backend metrics endpoint (change this if FE/BE not running on same host)
const METRICS_URL = process.env.REACT_APP_METRICS_API || 'http://localhost:3001/metrics';

// Table column definitions
const COLUMNS = [
  { key: "app_name", label: "App Name", sortable: true },
  { key: "elapsed_time", label: "Elapsed Time (s)", sortable: true },
  { key: "total_cost", label: "Total Cost ($)", sortable: true },
  { key: "date", label: "Date", sortable: true },
  { key: "project_link", label: "Project", sortable: false },
  { key: "cga_version", label: "CGA Version", sortable: true },
  { key: "model", label: "Model", sortable: true },
  { key: "streaming", label: "Streaming", sortable: true }
];

// Helper for formatting cost (2 decimals)
function formatCost(value) {
  if (value === null || value === undefined) return '';
  return Number(value).toFixed(2);
}

// PUBLIC_INTERFACE
function MetricsGalleryApp() {
  const [metrics, setMetrics] = useState([]);
  const [loading, setLoading] = useState(false);
  const [fetchError, setFetchError] = useState('');
  const [search, setSearch] = useState('');
  const [dateFrom, setDateFrom] = useState('');
  const [dateTo, setDateTo] = useState('');
  const [sortKey, setSortKey] = useState('date');
  const [sortDir, setSortDir] = useState('desc');
  const [page, setPage] = useState(1);
  const [rowsPerPage, setRowsPerPage] = useState(10);
  const [theme, setTheme] = useState('light');

  // Fetch metrics data from backend
  useEffect(() => {
    setLoading(true);
    setFetchError('');
    fetch(METRICS_URL)
      .then(res => {
        if (!res.ok) throw new Error(`Failed to fetch metrics (${res.status})`);
        return res.json();
      })
      .then(data => {
        setMetrics(data);
        setLoading(false);
      })
      .catch(err => {
        setFetchError(err.message);
        setLoading(false);
      });
  }, []);

  // Theme management (persist in localStorage)
  useEffect(() => {
    document.documentElement.setAttribute('data-theme', theme);
    localStorage.setItem('theme', theme);
  }, [theme]);
  useEffect(() => {
    const stored = localStorage.getItem('theme');
    if (stored) setTheme(stored);
  }, []);

  // PUBLIC_INTERFACE
  const toggleTheme = () => setTheme(prev => prev === 'light' ? 'dark' : 'light');

  // PUBLIC_INTERFACE
  // Filtering, searching, and sorting metrics
  const filteredSortedMetrics = useMemo(() => {
    let data = metrics.slice();
    // Search filter (case insensitive; search by app name, cga_version, model)
    if (search.trim()) {
      const q = search.trim().toLowerCase();
      data = data.filter(row =>
        (row.app_name && row.app_name.toLowerCase().includes(q)) ||
        (row.cga_version && row.cga_version.toLowerCase().includes(q)) ||
        (row.model && row.model.toLowerCase().includes(q))
      );
    }
    // Date filter (inclusive; expects ISO8601 or YYYY-MM-DD)
    if (dateFrom) data = data.filter(row => row.date >= dateFrom);
    if (dateTo) data = data.filter(row => row.date <= dateTo);
    // Sorting
    if (sortKey) {
      data = data.sort((a, b) => {
        let va = a[sortKey];
        let vb = b[sortKey];
        if (typeof va === 'string' && typeof vb === 'string' && sortKey !== 'date') {
          va = va.toLowerCase(); vb = vb.toLowerCase();
        }
        if (sortKey === "date") {
          // Try to parse as date
          try {
            va = new Date(va); vb = new Date(vb);
          } catch { va = a[sortKey]; vb = b[sortKey]; }
        }
        if (va < vb) return sortDir === 'asc' ? -1 : 1;
        if (va > vb) return sortDir === 'asc' ? 1 : -1;
        return 0;
      });
    }
    return data;
  }, [metrics, search, dateFrom, dateTo, sortKey, sortDir]);

  // Pagination
  const totalRows = filteredSortedMetrics.length;
  const totalPages = Math.max(1, Math.ceil(totalRows / rowsPerPage));
  const pagedMetrics = filteredSortedMetrics.slice((page - 1) * rowsPerPage, page * rowsPerPage);

  // Adjust page if filtering/paging changes
  useEffect(() => {
    if (page > totalPages) setPage(totalPages);
  }, [totalPages]);

  // PUBLIC_INTERFACE
  // Summary statistics: avg elapsed time, total cost, count
  const summaryStats = useMemo(() => {
    if (!filteredSortedMetrics.length) return { avgElapsed: 0, totalCost: 0, count: 0 };
    const tElapsed = filteredSortedMetrics.reduce((sum, r) => sum + (Number(r.elapsed_time) || 0), 0);
    const tCost = filteredSortedMetrics.reduce((sum, r) => sum + (Number(r.total_cost) || 0), 0);
    return {
      avgElapsed: tElapsed / filteredSortedMetrics.length,
      totalCost: tCost,
      count: filteredSortedMetrics.length
    };
  }, [filteredSortedMetrics]);

  // Accessibility helpers
  const sortLabel = key =>
    sortKey === key ? (sortDir === 'asc' ? ' ▲' : ' ▼') : '';

  // Handle table header click for sort
  // PUBLIC_INTERFACE
  const handleSort = key => {
    if (!COLUMNS.find(col => col.key === key && col.sortable)) return;
    if (sortKey === key) setSortDir(d => d === 'asc' ? 'desc' : 'asc');
    else {
      setSortKey(key);
      setSortDir('asc');
    }
  };

  // Styling for palette (custom props)
  const accentColor = 'var(--button-bg)';
  const primaryColor = '#2563eb';

  // UI/UX layout
  return (
    <div className="App" style={{ fontFamily: 'Inter, Segoe UI, sans-serif', background: 'var(--bg-primary)' }}>
      <header className="App-header" style={{ minHeight: 0, padding: 0, background: 'var(--bg-secondary)' }}>
        {/* Theme toggle (positioned in top right) */}
        <button
          className="theme-toggle"
          onClick={toggleTheme}
          aria-label={`Switch to ${theme === 'light' ? 'dark' : 'light'} mode`}
        >
          {theme === 'light' ? '🌙 Dark' : '☀️ Light'}
        </button>
        {/* Title and subtitle */}
        <div style={{ padding: "32px 8px 16px 8px", textAlign: "center" }}>
          <h1 style={{
            color: primaryColor,
            margin: "0 0 0.25em 0",
            fontWeight: 700,
            fontSize: "2.4em",
            letterSpacing: "-0.02em"
          }}>Kavia App Metrics Gallery</h1>
          <p style={{
            color: "var(--text-secondary)",
            fontSize: "1.17em",
            marginBottom: "1.5em"
          }}>Explore generated app metrics – filter, sort, search, and analyze with ease.</p>
        </div>
        {/* Summary statistics */}
        <section
          aria-label="Metrics Summary"
          style={{
            display: "flex",
            flexWrap: "wrap",
            gap: "16px",
            justifyContent: "center",
            background: "var(--bg-primary)",
            borderBottom: "1px solid var(--border-color)",
            padding: "12px 8px 12px 8px"
          }}>
          <StatCard label="Entries" value={summaryStats.count} accent="#64748b" />
          <StatCard label="Avg Elapsed (s)" value={formatCost(summaryStats.avgElapsed)} accent={primaryColor} />
          <StatCard label="Total Cost ($)" value={formatCost(summaryStats.totalCost)} accent="#d97706" />
        </section>
        {/* Filter/search controls */}
        <section style={{
          width: "100%",
          background: "var(--bg-secondary)",
          padding: "0.5em 0.5em",
          display: "flex",
          flexWrap: "wrap",
          justifyContent: "center",
          gap: "18px",
          borderBottom: "1px solid var(--border-color)"
        }}>
          <input
            aria-label="Search App Name, Model or Version"
            type="search"
            value={search}
            onChange={e => { setSearch(e.target.value); setPage(1); }}
            placeholder="🔍 Search app name/model/version"
            style={inputStyle}
          />
          <input
            aria-label="Date from"
            type="date"
            value={dateFrom}
            onChange={e => { setDateFrom(e.target.value); setPage(1); }}
            max={dateTo || ''}
            style={inputStyle}
          />
          <input
            aria-label="Date to"
            type="date"
            value={dateTo}
            onChange={e => { setDateTo(e.target.value); setPage(1); }}
            min={dateFrom || ''}
            style={inputStyle}
          />
          <select
            aria-label="Rows per page"
            value={rowsPerPage}
            onChange={e => { setRowsPerPage(Number(e.target.value)); setPage(1); }}
            style={inputStyle}
          >
            {[5, 10, 20, 50].map(num => (
              <option key={num} value={num}>{num} rows/page</option>
            ))}
          </select>
        </section>
        {/* Metrics table */}
        <section style={{
          maxWidth: "100vw",
          overflowX: "auto",
          margin: "0 auto 2em auto",
          width: "98%",
          background: "var(--bg-primary)"
        }}>
          {loading ? (
            <p style={{ textAlign: "center", padding: "2em", color: "var(--text-secondary)" }}>Loading data…</p>
          ) : fetchError ? (
            <p style={{ color: "red", padding: "2em", textAlign: "center" }}>Error: {fetchError}</p>
          ) : (
            <MetricsTable
              columns={COLUMNS}
              data={pagedMetrics}
              sortKey={sortKey}
              sortDir={sortDir}
              onSort={handleSort}
            />
          )}
        </section>
        {/* Pagination controls */}
        <section style={{
          textAlign: "center",
          paddingBottom: "2em"
        }}>
          <Pagination
            page={page}
            totalPages={totalPages}
            setPage={setPage}
            totalRows={totalRows}
            rowsPerPage={rowsPerPage}
          />
        </section>
        {/* Footer/link */}
        <footer style={{
          borderTop: "1px solid var(--border-color)",
          padding: "0.6em 0 1.6em 0",
          textAlign: "center",
          fontSize: "0.97em",
          color: "var(--text-secondary)"
        }}>
          <span>Made with <span aria-label="heart" style={{ color: "#E87A41" }}>♥</span> by Kavia | &copy; {new Date().getFullYear()}</span>
        </footer>
      </header>
    </div>
  );
}

const inputStyle = {
  border: "1px solid var(--border-color)",
  borderRadius: "7px",
  padding: "6px 14px",
  background: "var(--bg-primary)",
  color: "var(--text-primary)",
  fontSize: "1em",
  outline: "none",
  minWidth: "124px"
};

// PUBLIC_INTERFACE
function StatCard({ label, value, accent }) {
  return (
    <div style={{
      background: "var(--bg-secondary)",
      border: `2.5px solid ${accent}`,
      borderRadius: "10px",
      minWidth: "112px",
      padding: "8px 14px",
      textAlign: "center",
      transition: "border-color 0.33s"
    }}>
      <div style={{
        fontSize: "1.11em",
        color: accent,
        letterSpacing: 0.5
      }}>
        {label}
      </div>
      <div style={{
        fontWeight: 700,
        fontSize: "1.33em",
        color: "var(--text-primary)"
      }}>{value}</div>
    </div>
  );
}

// PUBLIC_INTERFACE
function MetricsTable({ columns, data, sortKey, sortDir, onSort }) {
  return (
    <table
      aria-label="Metrics Table"
      style={{
        borderCollapse: "collapse",
        fontSize: "1em",
        width: "100%",
        minWidth: 700,
        margin: "16px 0",
        background: "var(--bg-primary)",
        color: "var(--text-primary)",
        boxShadow: "0 2px 15px rgba(0,0,0,0.07)",
        borderRadius: "12px",
        overflow: "hidden"
      }}
    >
      <thead>
        <tr>
          {columns.map(col => (
            <th
              key={col.key}
              onClick={() => col.sortable && onSort(col.key)}
              style={{
                cursor: col.sortable ? 'pointer' : 'default',
                userSelect: 'none',
                padding: "11px 8px",
                borderBottom: "2px solid var(--border-color)",
                background: "var(--bg-secondary)",
                position: "sticky", top: 0,
                fontWeight: 700,
                fontSize: "1.04em",
                color: "var(--text-primary)"
              }}
              aria-sort={sortKey === col.key ? (sortDir === 'asc' ? 'ascending' : 'descending') : 'none'}
              scope="col"
            >
              {col.label}{col.sortable ? (
                <span style={{ marginLeft: 4, color: "#64748b" }}>
                  {sortKey === col.key ? (sortDir === 'asc' ? "▲" : "▼") : ""}
                </span>
              ) : null}
            </th>
          ))}
        </tr>
      </thead>
      <tbody>
        {(data && data.length)
          ? data.map((row, idx) => (
            <tr
              key={row.app_name + row.date + row.model + idx}
              style={{
                background: idx % 2 ? "var(--bg-secondary)" : "var(--bg-primary)"
              }}
            >
              <td style={cellStyle}>{row.app_name}</td>
              <td style={cellStyle}>{row.elapsed_time}</td>
              <td style={cellStyle}>{formatCost(row.total_cost)}</td>
              <td style={cellStyle}>{row.date}</td>
              <td style={cellStyle}><a href={row.project_link} target="_blank" rel="noopener noreferrer" style={linkStyle}>
                Open
              </a></td>
              <td style={cellStyle}>{row.cga_version}</td>
              <td style={cellStyle}>{row.model}</td>
              <td style={cellStyle}>{String(row.streaming) === 'true' || row.streaming === true ? "✅" : "—"}</td>
            </tr>
          ))
          : <tr>
            <td colSpan={columns.length} style={{ textAlign: "center", color: "#999", padding: "30px 0" }}>
              No results found.
            </td>
          </tr>
        }
      </tbody>
    </table>
  );
}
const cellStyle = {
  padding: "10px 7px",
  borderBottom: "1px solid var(--border-color)",
  textAlign: "center",
  maxWidth: 220,
  overflow: "hidden",
  textOverflow: "ellipsis",
  whiteSpace: "nowrap"
};
const linkStyle = {
  color: "var(--button-bg)", textDecoration: 'underline', fontWeight: 500
};

// PUBLIC_INTERFACE
function Pagination({ page, totalPages, setPage, totalRows, rowsPerPage }) {
  function goto(p) {
    if (p < 1 || p > totalPages) return;
    setPage(p);
  }
  // Accessibility: aria-label, buttons key nav, etc.
  const pageNumbers = [];
  for (
    let i = Math.max(1, page - 2);
    i <= Math.min(totalPages, page + 2);
    i++
  ) pageNumbers.push(i);

  return (
    <nav
      aria-label="Metrics Table Pagination"
      style={{ display: "inline-flex", alignItems: "center", gap: 4, background: "none", minHeight: 44 }}
    >
      <button style={pageBtnStyle} onClick={() => goto(1)} disabled={page === 1} aria-label="First page">&laquo;</button>
      <button style={pageBtnStyle} onClick={() => goto(page - 1)} disabled={page === 1} aria-label="Previous page">&lt;</button>
      {pageNumbers.map(n => (
        <button
          key={n}
          style={{
            ...pageBtnStyle,
            fontWeight: n === page ? 700 : 400,
            background: n === page ? "var(--button-bg)" : "var(--bg-primary)",
            color: n === page ? "var(--button-text)" : "var(--text-primary)"
          }}
          onClick={() => goto(n)}
          aria-label={`Page ${n}`}
          aria-current={n === page ? "page" : undefined}
        >{n}</button>
      ))}
      <button style={pageBtnStyle} onClick={() => goto(page + 1)} disabled={page === totalPages} aria-label="Next page">&gt;</button>
      <button style={pageBtnStyle} onClick={() => goto(totalPages)} disabled={page === totalPages} aria-label="Last page">&raquo;</button>
      <span style={{ marginLeft: 10, fontSize: 14, color: "var(--text-secondary)" }}>
        | {totalRows} results
      </span>
    </nav>
  );
}
const pageBtnStyle = {
  border: "1px solid var(--border-color)",
  borderRadius: "6px",
  padding: "3px 12px",
  margin: "0 2px",
  background: "var(--bg-primary)",
  color: "var(--text-primary)",
  cursor: "pointer",
  fontSize: "1em",
  minWidth: 27,
  transition: "background 0.2s"
};

export default MetricsGalleryApp;
