"""
Transcription service

import assemblyai as aai

# audio_file = "./local_file.mp3"
audio_file = "https://assembly.ai/wildfires.mp3"

config = aai.TranscriptionConfig(speech_model=aai.SpeechModel.best)

transcript = aai.Transcriber(config=config).transcribe(audio_file)

if transcript.status == "error":
  raise RuntimeError(f"Transcription failed: {transcript.error}")

print(transcript.text)


"""

from django.conf import settings


class TranscriptionService:
    def __init__(self, speakers_expected=2):
        import assemblyai as aai

        aai.settings.api_key = settings.ASSEMBLYAI_API_KEY
        self.aai = aai
        self.config = aai.TranscriptionConfig(
            speech_model=aai.SpeechModel.best,
            speaker_labels=True,
            speakers_expected=speakers_expected,
        )

    def transcribe(self, audio_file) -> tuple[str, list[dict]]:
        transcript = self.aai.Transcriber(config=self.config).transcribe(audio_file)
        if transcript.status == "error":
            raise RuntimeError(f"Transcription failed: {transcript.error}")
        vtt_transcript = transcript.export_subtitles_vtt()
        utterances_list = []
        for utt in transcript.utterances:
            utterance_dict = {
                "speaker": utt.speaker,
                "text": utt.text,
                "start": utt.start,
                "end": utt.end,
                "confidence": utt.confidence,
            }
            utterances_list.append(utterance_dict)
        return vtt_transcript, utterances_list
