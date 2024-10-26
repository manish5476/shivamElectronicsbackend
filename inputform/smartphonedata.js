js = {
  id: "001",
  name: "Redmi Note 13 Pro Plus",
  brand: "Xiaomi",
  model: "13 Pro Plus",
  releaseDate: "2024-07-11",
  price: {
    currency: "USD",
    amount: 499.99,
  },
  images: [
    "https://example.com/images/redmi_note_13_pro_plus_front.jpg",
    "https://example.com/images/redmi_note_13_pro_plus_back.jpg",
    "https://example.com/images/redmi_note_13_pro_plus_side.jpg",
    "https://example.com/images/redmi_note_13_pro_plus_angled.jpg",
  ],
  availability: {
    inStock: true,
    regions: ["North America", "Europe", "Asia"],
    colors: ["Black", "Blue", "Green"],
    variants: [
      {
        storage: "128GB",
        ram: "8GB",
        price: {
          currency: "USD",
          amount: 449.99,
        },
      },
      {
        storage: "256GB",
        ram: "12GB",
        price: {
          currency: "USD",
          amount: 499.99,
        },
      },
    ],
  },
  specifications: {
    buildMaterial: {
      front: "Gorilla Glass",
      back: "Aluminum",
      frame: "Metal",
    },
    dimensions: {
      height: "161.9mm",
      width: "74.3mm",
      depth: "8.4mm",
      weight: "204g",
    },
    display: {
      type: "AMOLED",
      size: "6.67 inches",
      resolution: "1080 x 2400 pixels",
      refreshRate: "120Hz",
      brightness: "1000 nits",
    },
    processor: {
      chipset: "Qualcomm Snapdragon 778G",
      cpu: "Octa-core",
      gpu: "Adreno 642L",
    },
    memory: {
      ramOptions: ["8GB", "12GB"],
      storageOptions: ["128GB", "256GB"],
      expandable: false,
    },
    camera: {
      rear: [
        {
          resolution: "200 MP",
          aperture: "f/1.8",
          features: ["OIS", "PDAF"],
        },
        {
          resolution: "8 MP",
          aperture: "f/2.2",
          type: "ultrawide",
        },
        {
          resolution: "2 MP",
          aperture: "f/2.4",
          type: "macro",
        },
      ],
      front: {
        resolution: "16 MP",
        aperture: "f/2.5",
      },
      features: [
        "HDR",
        "Panorama",
        "4K video recording",
        "AI scene recognition",
      ],
    },
    battery: {
      capacity: "5000mAh",
      charging: {
        wired: "67W",
        wireless: false,
      },
      estimatedBatteryLife: {
        talkTime: "22 hours",
        videoPlayback: "15 hours",
      },
    },
    os: {
      name: "MIUI",
      version: "13",
      basedOn: "Android 12",
      updateSupport: {
        osUpdates: "2 years",
        securityUpdates: "3 years",
      },
    },
    connectivity: {
      networks: ["5G", "4G LTE", "3G", "2G"],
      networkBands: {
        "5G": ["n1", "n3", "n28", "n78"],
        "4G": ["B1", "B3", "B5", "B8"],
        "3G": ["B1", "B5", "B8"],
      },
      sim: "Dual SIM (Nano-SIM, dual stand-by)",
      wifi: "Wi-Fi 6",
      bluetooth: "v5.2",
      gps: "Yes, with A-GPS, GLONASS, GALILEO",
      nfc: true,
      usb: "USB Type-C 2.0, OTG",
    },
    sensors: [
      "Fingerprint (side-mounted)",
      "accelerometer",
      "gyroscope",
      "proximity",
      "compass",
    ],
    audio: {
      jack: false,
      stereoSpeakers: true,
    },
  },
  features: {
    waterResistance: "IP68",
    specialFeatures: ["Infrared Blaster", "Gaming Mode", "FM Radio"],
    security: ["Face Unlock", "Fingerprint Sensor"],
    cameraModes: ["Night Mode", "Portrait", "Pro Mode"],
  },
  boxContents: [
    "Smartphone",
    "67W Charger",
    "USB Type-C Cable",
    "User Manual",
    "SIM Ejector Tool",
  ],
  ratings: {
    averageRating: 4.5,
    reviews: [
      {
        user: "JohnDoe123",
        rating: 5,
        title: "Excellent phone!",
        comment: "Great camera and battery life.",
        date: "2024-08-15",
      },
      {
        user: "JaneSmith",
        rating: 4,
        title: "Good value for the price",
        comment: "Overall very satisfied.",
        date: "2024-08-16",
      },
    ],
  },
  warranty: {
    duration: "12 months",
    type: "Manufacturer Warranty",
  },
};
