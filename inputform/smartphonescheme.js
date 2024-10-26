const mongoose = require("mongoose");

const smartphoneSchema = new mongoose.Schema({
  id: {
    type: String,
    required: true,
    unique: true,
  },
  name: {
    type: String,
    required: true,
  },
  brand: {
    type: String,
    required: true,
  },
  model: {
    type: String,
    required: true,
  },
  releaseDate: {
    type: Date,
    required: true,
  },
  price: {
    currency: {
      type: String,
      required: true,
    },
    amount: {
      type: Number,
      required: true,
    },
  },
  images: {
    type: [String],
    required: true,
  },
  availability: {
    inStock: {
      type: Boolean,
      required: true,
    },
    regions: {
      type: [String],
      required: true,
    },
    colors: {
      type: [String],
      required: true,
    },
    variants: [
      {
        storage: {
          type: String,
          required: true,
        },
        ram: {
          type: String,
          required: true,
        },
        price: {
          currency: {
            type: String,
            required: true,
          },
          amount: {
            type: Number,
            required: true,
          },
        },
      },
    ],
  },
  specifications: {
    buildMaterial: {
      front: String,
      back: String,
      frame: String,
    },
    dimensions: {
      height: String,
      width: String,
      depth: String,
      weight: String,
    },
    display: {
      type: String,
      size: String,
      resolution: String,
      refreshRate: String,
      brightness: String,
    },
    processor: {
      chipset: String,
      cpu: String,
      gpu: String,
    },
    memory: {
      ramOptions: [String],
      storageOptions: [String],
      expandable: Boolean,
    },
    camera: {
      rear: [
        {
          resolution: String,
          aperture: String,
          type: String,
          features: [String],
        },
      ],
      front: {
        resolution: String,
        aperture: String,
      },
      features: [String],
    },
    battery: {
      capacity: String,
      charging: {
        wired: String,
        wireless: Boolean,
      },
    },
    os: {
      name: String,
      version: String,
      basedOn: String,
      updateSupport: {
        osUpdates: String,
        securityUpdates: String,
      },
    },
    connectivity: {
      networks: [String],
      sim: String,
      wifi: String,
      bluetooth: String,
      gps: String,
      nfc: Boolean,
      usb: String,
    },
    sensors: [String],
    audio: {
      jack: Boolean,
      stereoSpeakers: Boolean,
    },
  },
  features: {
    waterResistance: String,
    specialFeatures: [String],
    security: [String],
    cameraModes: [String],
  },
  boxContents: {
    type: [String],
  },
  ratings: {
    averageRating: {
      type: Number,
      default: 0,
    },
    reviews: [
      {
        user: String,
        rating: Number,
        title: String,
        comment: String,
        date: Date,
      },
    ],
  },
  warranty: {
    duration: String,
    type: String,
  },
});

module.exports = mongoose.model("Smartphone", smartphoneSchema);
