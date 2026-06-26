import React, { useState } from 'react';
import { View, Text, StyleSheet, TouchableOpacity, ActivityIndicator, Platform } from 'react-native';
import * as DocumentPicker from 'expo-document-picker';
import * as FileSystem from 'expo-file-system';
import Papa from 'papaparse';
import { v4 as uuidv4 } from 'uuid';
import { supabase } from '../../services/SupabaseConfig';

export const InventoryUploadScreen = () => {
  const [isLoading, setIsLoading] = useState(false);
  const [selectedFileUri, setSelectedFileUri] = useState<string | null>(null);
  const [selectedFileObj, setSelectedFileObj] = useState<File | null>(null);
  const [selectedFileName, setSelectedFileName] = useState<string | null>(null);
  const [logMessages, setLogMessages] = useState<string[]>([]);

  const addLog = (message: string) => {
    setLogMessages(prev => [...prev, message]);
  };

  const handleSelectCSV = async () => {
    try {
      const result = await DocumentPicker.getDocumentAsync({ type: 'text/csv' });
      
      if (!result.canceled && result.assets && result.assets.length > 0) {
        setSelectedFileUri(result.assets[0].uri);
        setSelectedFileName(result.assets[0].name);
        if (Platform.OS === 'web' && result.assets[0].file) {
          setSelectedFileObj(result.assets[0].file);
        }
        addLog(`[Local Storage] Selected file: ${result.assets[0].name}`);
      }
    } catch (error) {
      addLog(`[Error] File Selection Failed: ${String(error)}`);
    }
  };

  const handleSyncToDatabase = async () => {
    if (!selectedFileUri) {
      addLog('[Error] No file selected.');
      return;
    }

    setIsLoading(true);
    addLog(`[Ingestion Pipeline] Extracting via ${Platform.OS} engine...`);

    try {
      const parseConfig = {
        header: true,
        skipEmptyLines: true,
        complete: async (results: any) => {
          addLog(`[PapaParse] Successfully mapped ${results.data.length} records. Initiating schema cast...`);

          const mappedData = results.data
            .filter((row: any) => Object.keys(row).length > 0) // Extra safety to strip purely empty objects
            .map((row: any) => {
              // 1. Hunt for any variation of an ID/SKU column
              let recordId = row['SKU'] || row['sku'] || row['ID'] || row['id'] || row['Item ID'] || row['Product ID'] || row['UUID'] || row['uuid'];
              
              const uuidRegex = /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i;

              // 2. If no ID exists, OR if the existing ID is not a valid UUID, mint a new cryptographically secure UUID
              if (!recordId || String(recordId).trim() === '' || !uuidRegex.test(String(recordId).trim())) {
                recordId = uuidv4();
              }

              const mappedRow: any = {
                id: String(recordId).trim(), 
                title: row['title'] || row['Title'] || row['Lot Name'] || 'BulqBox Lot',
                bulk_price: Number(row['bulk_price'] || row['Lot Price (Our Offer)'] || row['Lot Price'] || row['Price'] || 0),
                stock_status: row['stock_status'] || row['Status'] || 'Available',
                created_at: row['created_at'] || row['Created At'] || row['Date'] || new Date().toISOString()
              };

              const categoryId = row['Category_id'] || row['Category ID'] || row['category_id'] || row['Category'];
              if (categoryId) mappedRow.category_id = String(categoryId).trim();

              const manifestUrl = row['manifest_url'] || row['Manifest URL'] || row['Manifest'];
              if (manifestUrl) mappedRow.manifest_url = String(manifestUrl).trim();

              return mappedRow;
            });

          addLog(`[Supabase RLS] Engaging bulk upsert sequence...`);

          const { status, error } = await supabase
            .from('inventory_lots')
            .upsert(mappedData);

          if (error) {
            addLog(`[Supabase HTTP ${status}] Error: ${error.message}`);
          } else {
            addLog(`[Supabase HTTP ${status}] Success: Bulk Database Mutation Executed.`);
          }
          setIsLoading(false);
        },
        error: (error: any) => {
          addLog(`[PapaParse Error] Parsing failed: ${error.message}`);
          setIsLoading(false);
        }
      };

      if (Platform.OS === 'web' && selectedFileObj) {
        // Web: Parse File object directly
        Papa.parse(selectedFileObj, parseConfig);
      } else {
        // Native: Read as string first
        const csvString = await FileSystem.readAsStringAsync(selectedFileUri);
        Papa.parse(csvString, parseConfig);
      }
    } catch (error) {
      addLog(`[Execution Error] Pipeline collapsed: ${String(error)}`);
      setIsLoading(false);
    }
  };

  return (
    <View style={styles.container}>
      <Text style={styles.title}>Inventory Bulk Ingestion</Text>

      <TouchableOpacity 
        style={styles.button} 
        onPress={handleSelectCSV}
        disabled={isLoading}
      >
        <Text style={styles.buttonText}>Select BulqBox CSV</Text>
      </TouchableOpacity>

      {selectedFileName && (
        <Text style={styles.fileText}>Pending: {selectedFileName}</Text>
      )}

      <TouchableOpacity 
        style={[styles.button, styles.syncButton, (!selectedFileUri || isLoading) && styles.disabledButton]} 
        onPress={handleSyncToDatabase}
        disabled={!selectedFileUri || isLoading}
      >
        {isLoading ? (
          <ActivityIndicator color="#FFFFFF" />
        ) : (
          <Text style={styles.buttonText}>Sync to Database</Text>
        )}
      </TouchableOpacity>

      <View style={styles.logContainer}>
        <Text style={styles.logTitle}>Execution Logs:</Text>
        {logMessages.map((msg, index) => (
          <Text key={index} style={styles.logMessage}>{msg}</Text>
        ))}
      </View>
    </View>
  );
};

const styles = StyleSheet.create({
  container: {
    flex: 1,
    padding: 24,
    backgroundColor: '#0F172A', // WareyTheme Dark Mode Base
  },
  title: {
    fontSize: 24,
    fontWeight: 'bold',
    color: '#FFFFFF',
    marginBottom: 24,
    marginTop: 48, // Safe area pad
  },
  button: {
    backgroundColor: '#3B82F6',
    padding: 16,
    borderRadius: 8,
    alignItems: 'center',
    marginBottom: 12,
  },
  syncButton: {
    backgroundColor: '#10B981',
  },
  disabledButton: {
    backgroundColor: '#4B5563',
  },
  buttonText: {
    color: '#FFFFFF',
    fontWeight: 'bold',
    fontSize: 16,
  },
  fileText: {
    color: '#9CA3AF',
    marginBottom: 24,
    textAlign: 'center',
  },
  logContainer: {
    marginTop: 24,
    padding: 16,
    backgroundColor: '#1E293B',
    borderRadius: 8,
    flex: 1,
  },
  logTitle: {
    color: '#94A3B8',
    fontWeight: 'bold',
    marginBottom: 8,
  },
  logMessage: {
    color: '#E2E8F0',
    fontFamily: 'monospace',
    fontSize: 12,
    marginBottom: 4,
  }
});
