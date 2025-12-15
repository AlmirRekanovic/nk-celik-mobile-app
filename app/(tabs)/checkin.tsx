import {
  View,
  Text,
  StyleSheet,
  Platform,
  TouchableOpacity,
  ActivityIndicator,
  Alert,
  ScrollView,
} from 'react-native';
import { StatusBar } from 'expo-status-bar';
import { CameraView, CameraType, useCameraPermissions } from 'expo-camera';
import { useState } from 'react';
import { useAuth } from '@/contexts/AuthContext';
import { checkInTicket } from '@/services/tickets';
import { Ticket } from '@/types/products';
import { Camera, X, CheckCircle, XCircle, AlertCircle } from 'lucide-react-native';

type ScanResult = {
  type: 'success' | 'error' | 'warning';
  message: string;
  ticket?: Ticket;
};

export default function CheckInScreen() {
  const { member, isGuest } = useAuth();
  const [permission, requestPermission] = useCameraPermissions();
  const [scanning, setScanning] = useState(false);
  const [processing, setProcessing] = useState(false);
  const [scanResult, setScanResult] = useState<ScanResult | null>(null);

  if (!member?.is_admin) {
    return (
      <View style={styles.container}>
        <StatusBar style="dark" />
        <View style={styles.header}>
          <Text style={styles.headerTitle}>Check-in</Text>
        </View>
        <View style={styles.errorContainer}>
          <AlertCircle size={48} color="#DC2626" />
          <Text style={styles.errorTitle}>Nemate pristup</Text>
          <Text style={styles.errorText}>
            Samo administratori mogu skenirati karte.
          </Text>
        </View>
      </View>
    );
  }

  if (!permission) {
    return (
      <View style={styles.container}>
        <StatusBar style="dark" />
        <View style={styles.header}>
          <Text style={styles.headerTitle}>Check-in</Text>
        </View>
        <View style={styles.loadingContainer}>
          <ActivityIndicator size="large" color="#DC2626" />
        </View>
      </View>
    );
  }

  if (!permission.granted) {
    return (
      <View style={styles.container}>
        <StatusBar style="dark" />
        <View style={styles.header}>
          <Text style={styles.headerTitle}>Check-in</Text>
          {member && (
            <Text style={styles.headerSubtitle}>
              {member.first_name} {member.last_name}
            </Text>
          )}
        </View>
        <View style={styles.permissionContainer}>
          <Camera size={64} color="#D4AF37" />
          <Text style={styles.permissionTitle}>Dozvola za kameru</Text>
          <Text style={styles.permissionText}>
            Potrebna je dozvola za kameru kako biste mogli skenirati QR kodove.
          </Text>
          <TouchableOpacity style={styles.permissionButton} onPress={requestPermission}>
            <Text style={styles.permissionButtonText}>Dozvoli pristup</Text>
          </TouchableOpacity>
        </View>
      </View>
    );
  }

  const handleBarCodeScanned = async ({ data }: { data: string }) => {
    if (processing) return;

    setProcessing(true);
    setScanResult(null);

    try {
      const result = await checkInTicket(data, member.id);

      setScanResult({
        type: result.success ? 'success' : 'error',
        message: result.message,
        ticket: result.ticket,
      });

      setTimeout(() => {
        setProcessing(false);
        if (result.success) {
          setScanResult(null);
        }
      }, 3000);
    } catch (error) {
      setScanResult({
        type: 'error',
        message: 'Greška pri skeniranju karte',
      });
      setProcessing(false);
    }
  };

  const startScanning = () => {
    setScanResult(null);
    setScanning(true);
  };

  const stopScanning = () => {
    setScanning(false);
    setScanResult(null);
  };

  return (
    <View style={styles.container}>
      <StatusBar style="dark" />
      <View style={styles.header}>
        <Text style={styles.headerTitle}>Check-in</Text>
        {member && (
          <Text style={styles.headerSubtitle}>
            {member.first_name} {member.last_name}
          </Text>
        )}
      </View>

      {!scanning ? (
        <View style={styles.startContainer}>
          <Camera size={80} color="#D4AF37" />
          <Text style={styles.startTitle}>Spremno za skeniranje</Text>
          <Text style={styles.startText}>
            Pritisnite dugme ispod da započnete skeniranje QR kodova na kartama.
          </Text>
          <TouchableOpacity style={styles.scanButton} onPress={startScanning}>
            <Camera size={24} color="#FFFFFF" />
            <Text style={styles.scanButtonText}>Započni skeniranje</Text>
          </TouchableOpacity>
        </View>
      ) : (
        <View style={styles.scannerContainer}>
          <CameraView
            style={styles.camera}
            facing="back"
            onBarcodeScanned={processing ? undefined : handleBarCodeScanned}
            barcodeScannerSettings={{
              barcodeTypes: ['qr'],
            }}
          >
            <View style={styles.overlay}>
              <View style={styles.scanArea}>
                <View style={[styles.corner, styles.cornerTopLeft]} />
                <View style={[styles.corner, styles.cornerTopRight]} />
                <View style={[styles.corner, styles.cornerBottomLeft]} />
                <View style={[styles.corner, styles.cornerBottomRight]} />
              </View>

              <TouchableOpacity style={styles.closeButton} onPress={stopScanning}>
                <X size={24} color="#FFFFFF" />
              </TouchableOpacity>

              <Text style={styles.scanInstruction}>
                Usmerite kameru na QR kod karte
              </Text>
            </View>
          </CameraView>

          {(processing || scanResult) && (
            <View style={styles.resultOverlay}>
              {processing && !scanResult && (
                <View style={styles.processingContainer}>
                  <ActivityIndicator size="large" color="#FFFFFF" />
                  <Text style={styles.processingText}>Provjeravam kartu...</Text>
                </View>
              )}

              {scanResult && (
                <View style={styles.resultContainer}>
                  {scanResult.type === 'success' && (
                    <>
                      <CheckCircle size={64} color="#10B981" />
                      <Text style={styles.resultTitle}>Uspješno!</Text>
                    </>
                  )}
                  {scanResult.type === 'error' && (
                    <>
                      <XCircle size={64} color="#EF4444" />
                      <Text style={styles.resultTitle}>Greška</Text>
                    </>
                  )}
                  <Text style={styles.resultMessage}>{scanResult.message}</Text>
                  {scanResult.ticket && (
                    <View style={styles.ticketInfo}>
                      <Text style={styles.ticketInfoText}>
                        {scanResult.ticket.customer_name}
                      </Text>
                      <Text style={styles.ticketInfoText}>
                        {scanResult.ticket.event_name}
                      </Text>
                    </View>
                  )}
                </View>
              )}
            </View>
          )}
        </View>
      )}
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: '#F9FAFB',
  },
  header: {
    backgroundColor: '#000000',
    paddingTop: Platform.OS === 'ios' ? 50 : 40,
    paddingBottom: 16,
    paddingHorizontal: 16,
  },
  headerTitle: {
    fontSize: 24,
    fontWeight: 'bold',
    color: '#D4AF37',
  },
  headerSubtitle: {
    fontSize: 14,
    color: '#FEE2E2',
    marginTop: 4,
  },
  loadingContainer: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
  },
  errorContainer: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
    padding: 32,
  },
  errorTitle: {
    fontSize: 20,
    fontWeight: 'bold',
    color: '#111827',
    marginTop: 16,
    marginBottom: 8,
  },
  errorText: {
    fontSize: 16,
    color: '#6B7280',
    textAlign: 'center',
    lineHeight: 24,
  },
  permissionContainer: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
    padding: 32,
  },
  permissionTitle: {
    fontSize: 20,
    fontWeight: 'bold',
    color: '#111827',
    marginTop: 16,
    marginBottom: 8,
  },
  permissionText: {
    fontSize: 16,
    color: '#6B7280',
    textAlign: 'center',
    lineHeight: 24,
    marginBottom: 24,
  },
  permissionButton: {
    backgroundColor: '#D4AF37',
    paddingHorizontal: 24,
    paddingVertical: 14,
    borderRadius: 8,
  },
  permissionButtonText: {
    color: '#000000',
    fontSize: 16,
    fontWeight: '600',
  },
  startContainer: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
    padding: 32,
  },
  startTitle: {
    fontSize: 24,
    fontWeight: 'bold',
    color: '#111827',
    marginTop: 24,
    marginBottom: 12,
  },
  startText: {
    fontSize: 16,
    color: '#6B7280',
    textAlign: 'center',
    lineHeight: 24,
    marginBottom: 32,
  },
  scanButton: {
    backgroundColor: '#D4AF37',
    flexDirection: 'row',
    alignItems: 'center',
    gap: 12,
    paddingHorizontal: 24,
    paddingVertical: 14,
    borderRadius: 8,
  },
  scanButtonText: {
    color: '#000000',
    fontSize: 18,
    fontWeight: '600',
  },
  scannerContainer: {
    flex: 1,
    position: 'relative',
  },
  camera: {
    flex: 1,
  },
  overlay: {
    flex: 1,
    backgroundColor: 'transparent',
  },
  scanArea: {
    position: 'absolute',
    top: '25%',
    left: '10%',
    width: '80%',
    height: '30%',
  },
  corner: {
    position: 'absolute',
    width: 40,
    height: 40,
    borderColor: '#FFFFFF',
  },
  cornerTopLeft: {
    top: 0,
    left: 0,
    borderTopWidth: 4,
    borderLeftWidth: 4,
  },
  cornerTopRight: {
    top: 0,
    right: 0,
    borderTopWidth: 4,
    borderRightWidth: 4,
  },
  cornerBottomLeft: {
    bottom: 0,
    left: 0,
    borderBottomWidth: 4,
    borderLeftWidth: 4,
  },
  cornerBottomRight: {
    bottom: 0,
    right: 0,
    borderBottomWidth: 4,
    borderRightWidth: 4,
  },
  closeButton: {
    position: 'absolute',
    top: 20,
    right: 20,
    backgroundColor: 'rgba(0, 0, 0, 0.5)',
    borderRadius: 24,
    padding: 12,
  },
  scanInstruction: {
    position: 'absolute',
    bottom: 100,
    left: 0,
    right: 0,
    textAlign: 'center',
    color: '#FFFFFF',
    fontSize: 16,
    fontWeight: '600',
    backgroundColor: 'rgba(0, 0, 0, 0.5)',
    padding: 16,
  },
  resultOverlay: {
    position: 'absolute',
    top: 0,
    left: 0,
    right: 0,
    bottom: 0,
    backgroundColor: 'rgba(0, 0, 0, 0.85)',
    justifyContent: 'center',
    alignItems: 'center',
  },
  processingContainer: {
    alignItems: 'center',
  },
  processingText: {
    color: '#FFFFFF',
    fontSize: 18,
    marginTop: 16,
  },
  resultContainer: {
    alignItems: 'center',
    padding: 32,
  },
  resultTitle: {
    fontSize: 28,
    fontWeight: 'bold',
    color: '#FFFFFF',
    marginTop: 16,
    marginBottom: 8,
  },
  resultMessage: {
    fontSize: 18,
    color: '#FFFFFF',
    textAlign: 'center',
    lineHeight: 26,
  },
  ticketInfo: {
    marginTop: 24,
    backgroundColor: 'rgba(255, 255, 255, 0.1)',
    borderRadius: 8,
    padding: 16,
  },
  ticketInfoText: {
    fontSize: 16,
    color: '#FFFFFF',
    textAlign: 'center',
    marginVertical: 4,
  },
});
