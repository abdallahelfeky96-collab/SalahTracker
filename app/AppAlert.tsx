import React from 'react';
import { Modal, StyleSheet, Text, TouchableOpacity, View } from 'react-native';
import { t } from './../utils/i18n';

type AlertType = 'success' | 'error';

interface AppAlertProps {
  visible: boolean;
  message: string;
  type: AlertType;
  onClose: () => void;
}

export default function AppAlert({ visible, message, type, onClose }: AppAlertProps) {
  const bgColor = type === 'success' ? '#2e7d32' : '#c62828';
  const btnColor = type === 'success' ? '#1b5e20' : '#8e0000';

  return (
    <Modal visible={visible} transparent animationType="fade">
      <View style={styles.overlay}>
        <View style={[styles.container, { backgroundColor: bgColor }]}>
          <Text style={styles.title}>{type === 'success' ? t('success') : t('error')}</Text>
          <Text style={styles.message}>{message}</Text>
          <TouchableOpacity style={[styles.btn, { backgroundColor: btnColor }]} onPress={onClose}>
            <Text style={styles.btnText}>{t('ok')}</Text>
          </TouchableOpacity>
        </View>
      </View>
    </Modal>
  );
}

const styles = StyleSheet.create({
  overlay: { flex: 1, backgroundColor: 'rgba(0,0,0,0.7)', justifyContent: 'center', alignItems: 'center' },
  container: { width: '85%', borderRadius: 12, padding: 20, alignItems: 'center' },
  title: { color: '#fff', fontSize: 18, fontWeight: 'bold', marginBottom: 10 },
  message: { color: '#fff', fontSize: 15, textAlign: 'center', marginBottom: 20, lineHeight: 22 },
  btn: { paddingHorizontal: 24, paddingVertical: 10, borderRadius: 8 },
  btnText: { color: '#fff', fontWeight: 'bold', fontSize: 14 },
});
