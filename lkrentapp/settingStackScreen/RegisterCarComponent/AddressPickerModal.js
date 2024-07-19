import React, { useState, useRef, useMemo, useEffect } from 'react';
import {
  Modal,
  View,
  Text,
  FlatList,
  TouchableOpacity,
  StyleSheet,
  TextInput,
  ActivityIndicator,
  Keyboard,
  KeyboardAvoidingView,
  Platform
} from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import debounce from 'lodash.debounce';
import { autoComplete, getGeocodeByAddress } from '../../fetchData/Position'; // Adjust the import path

const AddressPickerModal = ({ visible, onClose, onSelect, items, title }) => {
  const [step, setStep] = useState(0);
  const [selectedCity, setSelectedCity] = useState(null);
  const [selectedDistrict, setSelectedDistrict] = useState(null);
  const [selectedWard, setSelectedWard] = useState(null);
  const [search, setSearch] = useState('');
  const [loading, setLoading] = useState(false);
  const [suggestions, setSuggestions] = useState([]);
  const flatListRef = useRef(null);
  const apiKey = process.env.GOONG_KEY_3; // Replace with your actual API key
  const apiKey_2 = process.env.GOONG_KEY_2;

  const handleCitySelect = (city) => {
    setSelectedCity(city);
    setStep(1);
    flatListRef.current.scrollToOffset({ animated: false, offset: 0 });
  };

  const handleDistrictSelect = (district) => {
    setSelectedDistrict(district);
    setStep(2);
    flatListRef.current.scrollToOffset({ animated: false, offset: 0 });
  };

  const handleWardSelect = (ward) => {
    setSelectedWard(ward);
    setStep(3);
    flatListRef.current.scrollToOffset({ animated: false, offset: 0 });
  };

  const handleStreetSelect = (suggestion) => {
    const street = suggestion.structuredFormatting.main_text;
    onSelect({ street, city: selectedCity, district: selectedDistrict, ward: selectedWard });
    onClose();
    setStep(0);
    setSelectedCity(null);
    setSelectedDistrict(null);
    setSelectedWard(null);
  };
  

  const handleBack = () => {
    if (step > 0) {
      setStep(step - 1);
      flatListRef.current.scrollToOffset({ animated: false, offset: 0 });
    }
  };

  const debouncedAutoComplete = useMemo(
    () =>
      debounce(async (input) => {
        if (input.length > 0) {
          setLoading(true);
          try {
            const location = `${selectedWard.name_with_type}, ${selectedDistrict.name_with_type}, ${selectedCity.name_with_type}`;
            const geocodeResult = await getGeocodeByAddress(location, apiKey_2);

            const suggestions = await autoComplete(input, apiKey, `${geocodeResult.latitude},${geocodeResult.longitude}`);

            const sortedSuggestions = suggestions.sort((a, b) => {
              const aMatch = a.description.includes(location);
              const bMatch = b.description.includes(location);
              if (aMatch && !bMatch) return -1;
              if (!aMatch && bMatch) return 1;
              return 0;
            });

            setSuggestions(sortedSuggestions);

          } catch (error) {
            console.error(error);
          } finally {
            setLoading(false);
          }
        } else {
          setSuggestions([]);
        }
      }, 500),
    [apiKey, apiKey_2, selectedCity, selectedDistrict, selectedWard]
  );

  useEffect(() => {
    if (step === 3) {
      debouncedAutoComplete(search);
    }
    return () => debouncedAutoComplete.cancel();
  }, [search, debouncedAutoComplete, step]);

  const renderItems = () => {
    switch (step) {
      case 0:
        return items.cities.map(city => ({ ...city, type: 'city' }));
      case 1:
        return Object.values(selectedCity['quan-huyen']).map(district => ({ ...district, type: 'district' }));
      case 2:
        return Object.values(selectedDistrict['xa-phuong']).map(ward => ({ ...ward, type: 'ward' }));
      case 3:
        return suggestions.map(suggestion => ({ ...suggestion, type: 'street' }));
      default:
        return [];
    }
  };

  const renderItem = ({ item }) => (
    <TouchableOpacity
      style={styles.touchableItem}
      onPress={() => {
        if (item.type === 'city') handleCitySelect(item);
        else if (item.type === 'district') handleDistrictSelect(item);
        else if (item.type === 'ward') handleWardSelect(item);
        else if (item.type === 'street') handleStreetSelect(item.description);
      }}
    >
      <Text style={styles.itemText}>{item.name_with_type || item.description}</Text>
    </TouchableOpacity>
  );

  return (
    <Modal
      transparent={true}
      animationType="slide"
      visible={visible}
      onRequestClose={onClose}
    >
      <KeyboardAvoidingView
        style={styles.modalOverlay}
        behavior={Platform.OS === "ios" ? "padding" : "height"}
      >
        <View style={styles.modalContainer}>
          <Text style={styles.modalTitle}>{title}</Text>
          {step > 0 && (
            <TouchableOpacity onPress={handleBack} style={styles.backButton}>
              <Ionicons name="arrow-back" size={20} color="#fff" />
              <Text style={styles.backButtonText}>Back</Text>
            </TouchableOpacity>
          )}
          {step === 3 ? (
            <View style={styles.searchContainer}>
              <Ionicons name="location-outline" size={24} color="black" style={styles.icon} />
              <TextInput
                placeholder="Nhập địa chỉ đường phố"
                style={styles.input}
                value={search}
                onChangeText={setSearch}
              />
            </View>
          ) : null}
          {loading ? (
            <ActivityIndicator style={styles.loading} size="large" color="#03a9f4" />
          ) : (
            <FlatList
              ref={flatListRef}
              data={renderItems()}
              keyExtractor={(item, index) => index.toString()}
              renderItem={renderItem}
              style={styles.list}
              onScrollBeginDrag={Keyboard.dismiss}
            />
          )}
          <TouchableOpacity onPress={onClose} style={styles.closeButton}>
            <Text style={styles.closeButtonText}>Đóng</Text>
          </TouchableOpacity>
        </View>
      </KeyboardAvoidingView>
    </Modal>
  );
};

const styles = StyleSheet.create({
  modalOverlay: {
    flex: 1,
    backgroundColor: 'rgba(0, 0, 0, 0.5)',
    justifyContent: 'center',
    alignItems: 'center',
  },
  modalContainer: {
    width: '85%',
    maxHeight: '70%',
    backgroundColor: '#fff',
    borderRadius: 10,
    padding: 20,
    elevation: 10,
  },
  modalTitle: {
    fontSize: 20,
    fontWeight: 'bold',
    marginBottom: 20,
    textAlign: 'center',
  },
  backButton: {
    flexDirection: 'row',
    alignItems: 'center',
    marginBottom: 10,
    backgroundColor: '#03a9f4',
    paddingVertical: 5,
    paddingHorizontal: 10,
    borderRadius: 5,
    alignSelf: 'flex-start',
  },
  backButtonText: {
    color: '#fff',
    fontSize: 14,
    fontWeight: 'bold',
    marginLeft: 5,
  },
  list: {
    maxHeight: '78%',
  },
  touchableItem: {
    paddingVertical: 15,
    paddingHorizontal: 10,
    borderBottomWidth: 1,
    borderBottomColor: '#ccc',
  },
  itemText: {
    fontSize: 16,
  },
  searchContainer: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: '#f1f1f1',
    borderRadius: 8,
    paddingHorizontal: 10,
    paddingVertical: 14,
    marginBottom: 25,
  },
  icon: {
    marginRight: 8,
  },
  input: {
    flex: 1,
    fontSize: 16,
  },
  loading: {
    marginTop: 30,
  },
  closeButton: {
    marginTop: 20,
    backgroundColor: '#03a9f4',
    padding: 10,
    borderRadius: 5,
    alignItems: 'center',
  },
  closeButtonText: {
    color: '#fff',
    fontSize: 16,
    fontWeight: 'bold',
  },
});

export default AddressPickerModal;
