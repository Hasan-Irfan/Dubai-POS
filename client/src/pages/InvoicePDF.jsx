import React from 'react';
import { Document, Page, Text, View, StyleSheet } from '@react-pdf/renderer';

const styles = StyleSheet.create({
  page: { padding: 30 },
  section: { marginBottom: 10 },
  heading: { fontSize: 18, marginBottom: 10 },
  field: { fontSize: 12, marginBottom: 4 },
  bold: { fontWeight: 700 },
});

const InvoicePDF = ({ transaction, vendor }) => (
  <Document>
    <Page size="A4" style={styles.page}>
      <Text style={styles.heading}>Invoice Details</Text>

      <View style={styles.section}>
        <Text style={styles.field}><Text style={styles.bold}>Vendor:</Text> {vendor.name}</Text>
        <Text style={styles.field}><Text style={styles.bold}>Contact:</Text> {vendor.contact?.phone}</Text>
        <Text style={styles.field}><Text style={styles.bold}>Date:</Text> {new Date(transaction.date).toLocaleDateString()}</Text>
      </View>

      <View style={styles.section}>
        <Text style={styles.field}><Text style={styles.bold}>Type:</Text> {transaction.type}</Text>
        <Text style={styles.field}><Text style={styles.bold}>Amount:</Text> {transaction.amount.toFixed(2)}</Text>
        <Text style={styles.field}><Text style={styles.bold}>Balance:</Text> {transaction.balance.toFixed(2)}</Text>
        <Text style={styles.field}><Text style={styles.bold}>Payment Method:</Text> {transaction.method}</Text>
        <Text style={styles.field}><Text style={styles.bold}>Description:</Text> {transaction.description}</Text>
      </View>
    </Page>
  </Document>
);

export default InvoicePDF;
