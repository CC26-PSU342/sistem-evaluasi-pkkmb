import json
import numpy as np
import tensorflow as tf
from tensorflow.keras.layers import TextVectorization, Layer

from preprocessing import preprocess
from schemas import PrediksiResponse, Probabilitas


CONFIDENCE_THRESHOLD = 0.45
LABEL_MAP = {0: "negatif", 1: "netral", 2: "positif"}


class AttentionLayer(Layer):
    def __init__(self, **kwargs):
        super().__init__(**kwargs)

    def build(self, input_shape):
        self.W = self.add_weight(
            name="attention_weight",
            shape=(input_shape[-1], 1),
            initializer="glorot_uniform",
            trainable=True,
        )
        self.b = self.add_weight(
            name="attention_bias",
            shape=(input_shape[1], 1),
            initializer="zeros",
            trainable=True,
        )
        super().build(input_shape)

    def call(self, inputs):
        score = tf.nn.tanh(tf.tensordot(inputs, self.W, axes=1) + self.b)
        attention_weights = tf.nn.softmax(score, axis=1)
        context = attention_weights * inputs
        return tf.reduce_sum(context, axis=1)

    def get_config(self):
        return super().get_config()

class WeightedSparseCCE(tf.keras.losses.Loss):
    def __init__(self, class_weights_dict=None, **kwargs):
        super().__init__(**kwargs)
        self.class_weights_dict = class_weights_dict or {0: 1.0, 1: 1.0, 2: 1.0}
        self._weights_tensor = tf.constant(
            [self.class_weights_dict[i] for i in sorted(self.class_weights_dict)],
            dtype=tf.float32,
        )

    def call(self, y_true, y_pred):
        cce = tf.keras.losses.sparse_categorical_crossentropy(y_true, y_pred)
        y_int = tf.cast(tf.reshape(y_true, [-1]), tf.int32)
        sample_weights = tf.gather(self._weights_tensor, y_int)
        return tf.reduce_mean(sample_weights * cce)

    def get_config(self):
        config = super().get_config()
        config.update({
            'class_weights_dict': {int(k): float(v) for k, v in self.class_weights_dict.items()}
        })
        return config


class SentimentModel:
    def __init__(self, model_path: str, vectorizer_path: str):
        self.model = tf.keras.models.load_model(
        model_path,
        custom_objects={
            "AttentionLayer": AttentionLayer,
            "WeightedSparseCCE": WeightedSparseCCE,
        },
    )
        with open(vectorizer_path, "r", encoding="utf-8") as f:
            vec_data = json.load(f)
        self.vectorizer = TextVectorization.from_config(vec_data["config"])
        self.vectorizer.set_vocabulary(vec_data["vocabulary"])
        self.vocab_size = len(vec_data["vocabulary"])

    def predict(self, text: str) -> PrediksiResponse:
        clean = preprocess(text)

        if not clean.strip():
            return PrediksiResponse(
                input_asli=text,
                teks_bersih=clean,
                sentimen="netral",
                confidence="0.00%",
                probabilitas=Probabilitas(negatif="0.00%", netral="100.00%", positif="0.00%"),
            )

        vec = self.vectorizer([clean])
        proba = self.model(vec, training=False).numpy()[0]
        pred_idx = int(np.argmax(proba))
        confidence = float(proba[pred_idx])

        if confidence < CONFIDENCE_THRESHOLD:
            pred_idx = 1

        return PrediksiResponse(
            input_asli=text,
            teks_bersih=clean,
            sentimen=LABEL_MAP[pred_idx],
            confidence=f"{confidence * 100:.2f}%",
            probabilitas=Probabilitas(
                negatif=f"{float(proba[0]) * 100:.2f}%",
                netral=f"{float(proba[1]) * 100:.2f}%",
                positif=f"{float(proba[2]) * 100:.2f}%",
            ),
        )

    def predict_batch(self, texts: list[str]) -> list[PrediksiResponse]:
        return [self.predict(t) for t in texts]