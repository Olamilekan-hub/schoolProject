using System;
using DPFP;
using DPFP.Capture;
using System.IO;

public class CaptureHandler : DPFP.Capture.EventHandler
{
    private Capture Capturer;

    public CaptureHandler()
    {
        Capturer = new Capture();
        Capturer.EventHandler = this;
    }

    public void Start()
    {
        Capturer.StartCapture();
        Console.WriteLine("Place your finger on the scanner...");
    }

    public void Stop()
    {
        Capturer.StopCapture();
    }

    public void OnComplete(object Capture, string ReaderSerialNumber, Sample Sample)
    {
        Console.WriteLine("Fingerprint captured!");

        // Convert to FeatureSet for Enrollment
        var extractor = new DPFP.Processing.FeatureExtraction();
        var feedback = DPFP.Capture.CaptureFeedback.None;
        var features = new DPFP.FeatureSet();

        extractor.CreateFeatureSet(Sample, DPFP.Processing.DataPurpose.Enrollment, ref feedback, ref features);
        if (feedback == DPFP.Capture.CaptureFeedback.Good)
        {
            byte[] bytes = features.Bytes;
            string base64 = Convert.ToBase64String(bytes);
            File.WriteAllText("fingerprint.txt", base64);
            Console.WriteLine("Template saved as Base64 to fingerprint.txt");
        }
        else
        {
            Console.WriteLine("Poor quality capture. Try again.");
        }
    }

    public void OnFingerTouch(object Capture, string ReaderSerialNumber) => Console.WriteLine("Finger touched.");
    public void OnFingerGone(object Capture, string ReaderSerialNumber) => Console.WriteLine("Finger removed.");
    public void OnReaderConnect(object Capture, string ReaderSerialNumber) => Console.WriteLine("Reader connected.");
    public void OnReaderDisconnect(object Capture, string ReaderSerialNumber) => Console.WriteLine("Reader disconnected.");
    public void OnSampleQuality(object Capture, string ReaderSerialNumber, CaptureFeedback Feedback) =>
        Console.WriteLine($"Quality: {Feedback}");
}

class Program
{
    static void Main()
    {
        var capture = new CaptureHandler();
        capture.Start();
        Console.ReadLine();
        capture.Stop();
    }
}
