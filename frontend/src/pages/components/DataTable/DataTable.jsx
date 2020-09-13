import React from "react";
import "./data-table.css";

export default function DataTable({ header, rows }) {
  let tableHeader = [];
  if (header) {
    header.forEach(headerStr => tableHeader.push(<th>{headerStr}</th>));
  }
  let tableRows = [];
  if (rows) {
    rows.forEach(rowArray => {
      let rowEntry = [];
      rowArray.forEach(rowValue => {
        rowEntry.push(<td className="data-table-cell">{rowValue}</td>);
      });
      tableRows.push(<tr className="data-table-row">{rowEntry}</tr>);
    });
  }
  return (
    <div className="data-table-container">
      <table className="data-table">
        <thead>
          <tr className="data-table-header-row">
            {tableHeader}
          </tr>
        </thead>
        <tbody>
          {tableRows}
        </tbody>
      </table>
    </div>
  )
}